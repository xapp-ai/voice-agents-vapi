import { ServiceTitanService } from "@xapp/stentor-service-servicetitan";
import axios, { AxiosRequestConfig } from "axios";

const authenticate = async (): Promise<{ accessToken: string }> => {
    const authenticationCredentials: Record<string, any> = {
        grant_type: "client_credentials",
        client_id: process.env.ST_Client_Id,
        client_secret: process.env.ST_Client_Secret
    };

    const params = new URLSearchParams();
    for (const key in authenticationCredentials) {
        params.set(key, authenticationCredentials[key]);
    }

    const config: AxiosRequestConfig = {
        method: "post",
        url: "https://" + process.env.ST_Auth_Endpoint,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: new URLSearchParams(params.toString()).toString()
    };

    const response = await axios(config);

    return {
        accessToken: response.data.access_token
    };
};

export const FsmService = new ServiceTitanService({
    appId: "home-services",
    authenticate,
    tenantId: process.env.ST_Tenant as string,
    bookingProviderId: process.env.ST_Booking_Provider as string,
    apiEndpoint: process.env.ST_API_Endpoint as string,
    apiToken: process.env.ST_Application_Key as string,
    openAI: {
        apiKey: process.env.OPENAI_API_KEY as string
    }
});

