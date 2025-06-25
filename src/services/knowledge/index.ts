import axios from "axios";

const baseUrl = "https://api.xapp.ai";

export async function getKnowledge(query: string, token: string) {
  const config = {
    method: "get",
    url: `${baseUrl}/cms/rag?question=${encodeURIComponent(query)}`,
    headers: {
      Accept: "application/json",
      // Authorization: `Bearer ${process.env.STUDIO_TOKEN}`,
      Authorization: `Bearer ${token}`
    },
  };

  const response = await axios(config);

  const data = await response.data;

  console.log(data);

  if (data?.hasAnswer) {
    return data?.result;
  } else {
    return `I don't know`;
  }
}
