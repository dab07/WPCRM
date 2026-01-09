import { NextRequest, NextResponse } from 'next/server';
import { serviceRegistry } from '../../../../lib/services/ServiceRegistry';
import { 
  validateCreateContactRequest, 
  ValidationError
} from '../../../../lib/utils/type-validation';
import { handleApiError } from '../../../../lib/utils/api-client';
import type { CreateContactResponse } from '../../../../lib/types/api/responses';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/contacts/create - Request received');
    
    // Parse and validate request body
    const rawBody = await request.json();
    console.log('[API] Raw request body:', { name: rawBody.name, phone: rawBody.phone_number });

    // Validate request data against schema
    const validatedBody = validateCreateContactRequest(rawBody);
    console.log('[API] ✅ Request validation passed');

    const result = await serviceRegistry.contactBusiness.createContactWithWelcome(validatedBody);

    console.log('[API] ✅ Contact creation completed:', {
      contactId: result.contact.id,
      success: result.success,
      messageId: result.messageId
    });

    // Return validated response
    const response: CreateContactResponse = {
      success: result.success,
      contact: result.contact,
      message: result.success ? 'Contact created and welcome message sent' : 'Contact created but welcome message failed',
      ...(result.messageId && { messageId: result.messageId }),
      ...(result.conversationId && { conversationId: result.conversationId }),
      ...(result.warning && { warning: result.warning }),
      ...(result.error && { error: result.error })
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[API] ❌ Error:', error);
    
    // Handle validation errors with specific status codes
    if (error instanceof ValidationError) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Handle other errors
    const errorResponse = handleApiError(error);
    const statusCode = error.message?.includes('not found') ? 404 : 
                      error.message?.includes('already exists') ? 409 : 500;
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}