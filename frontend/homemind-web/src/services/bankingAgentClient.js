const BANKING_AGENT_URL = "http://localhost:8787";

export async function sendBankingCommand(command) {
  const response = await fetch(`${BANKING_AGENT_URL}/api/banking/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command }),
  });

  return response.json();
}

export async function openMizrahiBank() {
  const response = await fetch(`${BANKING_AGENT_URL}/api/banking/mizrahi/open`, {
    method: "POST",
  });

  return response.json();
}