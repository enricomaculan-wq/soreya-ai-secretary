import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMimeEmailPlainText, encodeGmailRaw } from "./email-mime.ts";

describe("buildMimeEmailPlainText", () => {
  it("builds a UTF-8 reply with threading headers", () => {
    const raw = buildMimeEmailPlainText({
      fromEmail: "studio@example.com",
      fromName: "Studio Demo",
      to: "paziente@example.com",
      subject: "Re: Richiesta appuntamento",
      body: "Buongiorno,\n\nGrazie per il messaggio.\n\nCordiali saluti,\nSoreya",
      inReplyTo: "<original@mail.gmail.com>",
      references: "<original@mail.gmail.com>",
    });

    assert.match(raw, /^From: /m);
    assert.match(raw, /^To: paziente@example.com/m);
    assert.match(raw, /^In-Reply-To: <original@mail.gmail.com>/m);
    assert.match(raw, /^References: <original@mail.gmail.com>/m);
    assert.match(raw, /Content-Type: text\/plain; charset=UTF-8/);
  });

  it("encodes gmail raw payload in base64url", () => {
    const encoded = encodeGmailRaw("Subject: test\r\n\r\nbody");
    assert.equal(encoded.includes("+"), false);
    assert.equal(encoded.includes("/"), false);
    assert.equal(encoded.endsWith("="), false);
  });
});
