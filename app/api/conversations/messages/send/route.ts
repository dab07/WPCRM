import { NextRequest, NextResponse } from 'next/server';
import { serviceRegistry } from '../../../../../lib/services/ServiceRegistry';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, agentId } = await request.json();

    const result = await serviceRegistry.conversationBusiness.sendMessageInConversation(
      conversationId,
      message,
      agentId
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('required fields') ? 400 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}