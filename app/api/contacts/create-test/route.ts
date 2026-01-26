import { NextRequest, NextResponse } from 'next/server';
import { serviceRegistry } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const testContacts = [
      {
        name: 'John Doe',
        phone_number: '+1234567890',
        email: 'john@example.com',
        company: 'Test Company',
        tags: ['test', 'vip'],
        source: 'test_data',
        metadata: {
          test_contact: true,
          created_by: 'api'
        }
      },
      {
        name: 'Jane Smith',
        phone_number: '+1234567891',
        email: 'jane@example.com',
        company: 'Demo Corp',
        tags: ['test', 'customer'],
        source: 'test_data',
        metadata: {
          test_contact: true,
          created_by: 'api'
        }
      }
    ];

    const createdContacts = [];
    
    for (const contactData of testContacts) {
      try {
        // Check if contact already exists
        const existingContacts = await serviceRegistry.contacts.list({
          filters: { phone_number: contactData.phone_number }
        });
        
        if (existingContacts.length === 0) {
          const contact = await serviceRegistry.contacts.create(contactData);
          createdContacts.push(contact);
        } else {
          console.log(`Contact ${contactData.phone_number} already exists`);
        }
      } catch (error) {
        console.error(`Failed to create contact ${contactData.phone_number}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      created_contacts: createdContacts.length,
      total_test_contacts: testContacts.length,
      message: `Created ${createdContacts.length} new test contacts`
    });

  } catch (error) {
    console.error('[Create Test Contacts] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test contacts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get count of existing test contacts
    const contacts = await serviceRegistry.contacts.list();
    const testContacts = contacts.filter(c => c.metadata?.test_contact === true);
    
    return NextResponse.json({
      success: true,
      total_contacts: contacts.length,
      test_contacts: testContacts.length,
      message: 'Test contacts status',
      usage: 'POST to this endpoint to create test contacts'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get contacts status'
    }, { status: 500 });
  }
}