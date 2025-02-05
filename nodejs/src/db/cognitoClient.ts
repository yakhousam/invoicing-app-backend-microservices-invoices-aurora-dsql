import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

let cachedCognitoClient: CognitoIdentityProviderClient | null = null;

const getCognitoClient = () => {
  if (cachedCognitoClient) {
    return cachedCognitoClient;
  }
  const cognitoClient = new CognitoIdentityProviderClient({
    region: "us-east-1",
  });

  cachedCognitoClient = cognitoClient;
  return cognitoClient;
};

export default getCognitoClient;
