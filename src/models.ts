
export interface PhoneNumberConfig {
    appId: string;
    firstMessage: string;
    name: string;
    phone: string;
    website?: string;
    token: string;
}

export const externalLead = (args: any, transcript: any) => {
    return {
      transcript,
      fields: [
        {
          name: "FULL_NAME",
          value: `${args?.customer_name}`,
        },
        {
          name: "ADDRESS",
          value: `${args?.customer_address}`,
        },
        {
          name: "PHONE",
          value: `${args?.customer_phone}`,
        },
        {
          name: "EMAIL",
          value: `${args?.customer_email}`,
        },
        {
          name: "MESSAGE",
          value: `${args?.reason_for_appointment}`,
        },
        {
          name: "DATETIME",
          value: `${args?.appointment_date}`,
        },
        {
          name: "PREFERRED_TIME",
          value: "morning",
        },
        {
          name: "CONSENT_APPROVAL",
          value: true,
        },
      ],
    };
  };

  export interface OutboundCall {
    name: string;
    customer: {
      number: string;
    };
    phoneNumberId: string;
    workflowId: string;
    workflowOverrides: {
      variableValues: OutboundCallWorkflowOverrides
    },
  //   voicemailDetection: {
  //     provider: string;
  // },
  // voicemailMessage: string;
  // backgroundSound: 'off' | 'office'
  
}

  export interface OutboundCallWorkflowOverrides {
    customer_name: string;
    customer_address: string;
    customer_phone: string;
    customer_email: string;
    service_requested: string;
    requested_date: string;
    preferred_time: string;
  }

  
    
  
   