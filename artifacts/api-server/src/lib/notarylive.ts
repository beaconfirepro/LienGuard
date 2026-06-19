/**
 * notarylive.ts — NotaryLive integration abstraction.
 *
 * In production: creates a NotaryLive signing session via their REST API and
 * returns the session URL the signer visits to complete remote online notarization.
 * In dev / no key: returns a stub session reference.
 */

export interface NotarySession {
  sessionRef: string;
  signingUrl: string;
}

export async function createNotarySession(
  signerName: string,
  signerEmail: string,
  documentDescription: string,
  webhookUrl: string,
): Promise<NotarySession> {
  const apiKey = process.env.NOTARYLIVE_API_KEY;

  if (apiKey) {
    const resp = await fetch("https://api.notarylive.com/v1/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        signer: { name: signerName, email: signerEmail },
        document: { description: documentDescription },
        webhook_url: webhookUrl,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`NotaryLive API error ${resp.status}: ${err}`);
    }

    const data = await resp.json() as { session_id: string; signing_url: string };
    return { sessionRef: data.session_id, signingUrl: data.signing_url };
  }

  // Stub — returns a fake session reference for dev/test.
  const stubRef = `nl_stub_${Date.now().toString(36)}`;
  return {
    sessionRef: stubRef,
    signingUrl: `https://app.notarylive.com/signer/${stubRef}`,
  };
}
