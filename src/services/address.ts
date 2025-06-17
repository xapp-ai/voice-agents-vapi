import axios from "axios";

const baseUrl = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json/";

export const getFormattedAddress = async (address: string) => {

    // use GOOGLE place api to verify address
    const googlePlaceApiKey = process.env.GOOGLE_PLACES_KEY;
    const googlePlaceApiUrl = `${baseUrl}?input=${address}&inputtype=textquery&fields=formatted_address,geometry,name,photos,place_id&key=${googlePlaceApiKey}`;
    const response = await axios.get(googlePlaceApiUrl);

    if (response.data?.candidates?.length > 0) {
        return response.data.candidates[0].formatted_address;
    }

    return undefined;
}

export const normalizeAddress = (address: string) => {
    // Regular expressions to capture house number and zip code
    const houseNumberRegex = /^(\d+\s*)+/;
    const zipCodeRegex = /(\d\s\d\s\d\s\d\s\d)$/;
  
    // Replace spaces in house number
    let matchHouseNumber = address.match(houseNumberRegex);
  
    if (!matchHouseNumber) {
      return address;
    }
  
    let normalizedAddress = address.replace(
      matchHouseNumber[0],
      matchHouseNumber[0].replace(/\s+/g, "") + " ",
    );
  
    let matchZipCode = normalizedAddress.match(zipCodeRegex);
  
    if (!matchZipCode) {
      return normalizedAddress;
    }
  
    // Replace spaces in zip code
    normalizedAddress = normalizedAddress.replace(
      matchZipCode[0],
      matchZipCode[0].replace(/\s+/g, ""),
    );
  
    //console.log('2',normalizedAddress);
  
    return normalizedAddress;
  }
  