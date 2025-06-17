import "dotenv/config";
import express from "express";
import { Client } from "pg";
import moment from "moment";
import { getKnowledge } from "./services/knowledge";
import { AFTER_HOURS_SYSTEM_PROMPT } from "./prompts";
import { PhoneNumberConfig } from "./models";
import { getFormattedAddress, normalizeAddress } from "./services/address";
import { availabilitySettings } from "./services/availability";

const app = express();
app.use(express.json());
const DEFAULT_WELCOME_MESSAGE =
  "Hello, I'm an AI assistant. How can I help you today?";
const SAVE_CALLS_WEBHOOK = "https://hooks.zapier.com/hooks/catch/12115949/2qtulsb/";
const TOOLS = ["d6bea374-620b-4c6a-a554-af21029c1a4c"];
const PRODUCTION_URL = "https://vapi-petehaas1.replit.app/";
const VAPI_BASE_URL = "https://api.vapi.ai/";

// Convert the collected information into a XAPP Lead
const externalLead = (args: any, transcript: any) => {
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

// Listening
app.all("/", async (req: any, res: any) => {
  res.json({
    message: "XAPP Voice Agent - Listening...",
  });
});

// Assistant Request
app.all("/route", async (req: any, res: any) => {
  const request_type = req?.body?.message?.type;
  const appId = req?.query.appId;

  if (request_type) {
    console.log("incoming: ", request_type);
  }

  if (request_type === "assistant-request") {
    const dnis = req.body?.message?.phoneNumber?.number;

    if (dnis) {
      const config = await lookupDnis(dnis);

      var json = {
        model:{},
        assistant: {
          metadata: {
            name: config.name,
            email: config.email,
            phoneNumber: config.number,
            appId,
          },
          firstMessage: config?.firstMessage || DEFAULT_WELCOME_MESSAGE,
          serverMessages: ["end-of-call-report"],
          serverUrl: SAVE_CALLS_WEBHOOK,
          backgroundDenoisingEnabled: true,
          backgroundSound: "off",
          endCallFunctionEnabled: true,
          endCallMessage: "Goodbye",
          endCallPhrases: ["goodbye", "bye"],
          messagePlan: {
            idleMessages: [
              "Is there anything else you need help with?",
              "How can I assist you further?",
            ],
          },
          startSpeakingPlan: {
            waitSeconds: 0.6,
            smartEndpointingEnabled: true,
          },
          stopSpeakingPlan: {
            numWords: 0.6,
          },
          voice: {
            voiceId: "nova",
            provider: "openai",
            fallbackPlan: {
              voices: [
                {
                  provider: "cartesia",
                  voiceId: "248be419-c632-4f23-adf1-5324ed7dbf1d",
                },
              ],
            },
          },
        },
      };

      json.model = {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${AFTER_HOURS_SYSTEM_PROMPT(config.name)}`,
          },
        ],
        toolIds: TOOLS,
        temperature: 0.7,
        emotionRecognitionEnabled: true,
      };

      return res.json(json);
    } else {
      res.json({
        error: "Incoming request does not have a phone number",
      });
    }
    // Inject the customer into the json
  } else {
    res.json({
      handled: request_type,
    });
  }

  //res.json(json);
});

// Function Request
app.all("/tool-call", async (req: any, res: any) => {
    const msg = req.body;
    const results = [];
    const request_type = req.body?.message?.type;
  
    // Transcript
    const transcript: any[] = [];
    msg.message?.artifact?.messages?.forEach((artifact: any) => {
      if (artifact.role !== "system") {
        transcript.push({
          from: { id: artifact.role },
          message: artifact.message,
        });
      }
    });
  
    // Go through tool calls
    if (msg.message?.toolCalls) {
      for (const toolCall of msg.message.toolCalls) {
        let function_name = toolCall?.function?.name;
        console.log("tool call: ", function_name);
  
        switch (function_name) {
          case "book_appointment": {
            const lead = externalLead(toolCall?.function?.arguments, transcript);
  
            // TODO: Implement booking
            // const booking = await fieldPulse.send(lead);
            const booking = {
                status: "success",
                message: "Appointment Booked"
            }
  
            results.push({
              toolCallId: toolCall?.id,
              result: "Appointment Booked " + booking.status,
            });
  
            break;
          }
  
          case "verify_address": {
            const formatted_address = await getFormattedAddress(
              toolCall.function?.arguments?.customer_address,
            );
  
            results.push({
              toolCallId: toolCall?.id,
              result: formatted_address,
            });
  
            break;
          }
  
          case "get_availability": {
            const availabilityDates = await availabilitySettings(
              results,
              toolCall,
            );
            return res.json(availabilityDates);
          }
  
          // Called from Block
          case "tool": {
            // Address Verification
            if (
              msg.message?.toolCalls[0].function?.arguments?.collected_address
            ) {
              //console.log("tool call: ", JSON.stringify(msg.message?.artifact?.messages));
              const toolCalls = msg.message?.artifact?.messages?.find(
                (message: any) => {
                  //console.log('MESSAGE: ',message);
  
                  return (
                    message.role === "tool_calls" &&
                    JSON.parse(message["toolCalls"][0].function?.arguments)
                      .customer_address
                  );
                },
              );
  
              const verify_this_address = JSON.parse(
                toolCalls.toolCalls[0].function?.arguments,
              ).customer_address;
  
              const formatted_address = await getFormattedAddress(
                normalizeAddress(verify_this_address),
              );
  
              const json = {
                results: {
                  toolCallId: toolCalls?.toolCalls[0].id,
                  result: formatted_address
                    ? formatted_address
                    : "invalid address",
                },
              };
              return res.json(json);
            }
  
            // Get Availabilty
            else if (toolCall.function?.arguments?.get_availability) {
              const dates = [];
              const availabilityDates = await availabilitySettings(
                results,
                toolCall,
              );
  
              // dates.push({
              //   availabilityDates,
              // });
  
              // loop through the dates and add them to the results
              let dateString = "";
              let dayOfWeekString = "";
              for (const item of availabilityDates[0].result.availableDates) {
                dateString += item.date + ", ";
                dayOfWeekString += item.dayOfWeek + ", ";
              }
  
              let datePrompt = `
              [Task]
              - Collect a valid date from the caller
              - Once you collect the selected_date, pass it onto the next step
              [Rules]
              Today is {{now}}.  Don't allow users to book appointments today, or before today.  Only allow the user to book two weeks out.  Below are the available dates.  Please select the date you would like to book.  If you don't have a preferred date, select the first available date.
              [Available Dates]
              ${dateString}`;
  
              // const json = {
              //   results: availabilityDates,
              // };
  
              const json = {
                results: {
                  toolCallId: availabilityDates[0].toolCallId,
                  result: datePrompt,
                },
              };
  
              // console.log("JSON: ", json);
  
              return res.json(json);
            }
          }
          break;
  
          default: {
            results.push({
              toolCallId: toolCall?.id,
              result: `no match for ${function_name}`,
            });
  
            break;
          }
        }
      }
    }
  
    return res.json({
      results,
    });
  });
  

app.all("/knowledge-base", async (req: any, res: any) => {
  const results = [];
  var answer = "I don't know";

  // loop through the tool calls and get the knowledge base
  const toolCalls = req.body.message.toolCalls;
  const askQuestion = toolCalls.find((toolCall: any) => {
    return toolCall.function?.name === "ask-question";
  });

  console.log(askQuestion);

  if (askQuestion.function?.arguments?.question) {
    const dnis = req.body?.message?.phoneNumber?.number;
    const config = await lookupDnis(dnis);
    const {question} = askQuestion.function?.arguments; 
    answer = await getKnowledge(question,config?.token);
  }

  results.push({
    toolCallId: askQuestion?.id,
    result: answer,
  });

  return res.json({ results });
});

app.post("/new-number", async (req: any, res: any) => {
  console.log(req.body);
  const phone = await createPhoneNumber(req.body) as any;

  phone.formattedNumber = formatPhoneNumber(req.body.phone);

  return res.json({ result: phone });
});

app.post("/save-number", async (req: any, res: any) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(
      `INSERT INTO dnis_map (dnis, config) VALUES ($1, $2)`,
      [req.body.phone, req.body as PhoneNumberConfig],
    );
    await client.end();
    return res.json({ result });
  } catch (err) {
    console.log("error", err);
  }
  return res.json({ result: "error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`XAPP Voice AgentServer running...`);
});

// Lookup the dialed number (DNIS) to determine the configuration
const lookupDnis = async (dnis: string) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT * FROM dnis_map WHERE dnis = '${dnis}'`,
    );
    if (result?.rows?.length > 0) {
      return result.rows[0].config;
    } else {
      return {};
    }
  } finally {
    await client.end();
  }
};

const extractPhoneNumber = (number: string) => {
  return number?.replace(/^\+1(\d+)$/, "");
};

function formatPhoneNumber(phoneNumber: string) {
  const regex = /^\+1(\d{3})(\d{3})(\d{4})$/;
  const match = phoneNumber.match(regex);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  } else {
    return "Invalid phone number format";
  }
}

const createPhoneNumber = async (phoneRequest: any) => {
  // Create Phone Number (POST /phone-number)
  const response = await fetch(`${VAPI_BASE_URL}phone-number`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "twilio",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      number: phoneRequest.phone,
      server: {
        url: `${PRODUCTION_URL}route?appId=${phoneRequest.appId}`,
        timeoutSeconds: 10,
        secret: "",
        headers: {},
      },
      name: phoneRequest.name,
    }),
  });

  const body = await response.json();

  console.log(body);

  return body;
};
