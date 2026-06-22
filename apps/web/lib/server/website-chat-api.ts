import { randomBytes } from "node:crypto";

export function generateWebsiteChatSessionToken() {
  return randomBytes(24).toString("base64url");
}

export function buildWebsiteChatEmbedSnippet(origin: string, organizationSlug: string) {
  return `<div id="soreya-chat-root"></div>
<script>
  (function () {
    const root = document.getElementById("soreya-chat-root");
    if (!root) return;

    const config = {
      origin: "${origin}",
      organizationSlug: "${organizationSlug}",
      formToken: "INSERISCI_IL_TOKEN_DA_IMPOSTAZIONI_FORM",
      pollIntervalMs: 3000,
    };

    let sessionToken = null;
    let lastMessageAt = null;
    let pollTimer = null;

    const panel = document.createElement("div");
    panel.style.cssText = "position:fixed;right:20px;bottom:80px;width:320px;max-width:calc(100vw - 40px);height:420px;background:#fff;border:1px solid #e7e5e4;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.12);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:system-ui,sans-serif;";
    panel.innerHTML = '<div style="padding:12px 14px;border-bottom:1px solid #e7e5e4;font-weight:600;">Chat con lo studio</div><div id="soreya-chat-messages" style="flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#fafaf9;"></div><form id="soreya-chat-form" style="display:flex;gap:8px;padding:12px;border-top:1px solid #e7e5e4;"><input id="soreya-chat-input" placeholder="Scrivi un messaggio..." style="flex:1;border:1px solid #d6d3d1;border-radius:10px;padding:10px 12px;" required /><button type="submit" style="border:none;background:#0c0a09;color:#fff;border-radius:10px;padding:10px 14px;">Invia</button></form>';

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.textContent = "Chat";
    launcher.style.cssText = "position:fixed;right:20px;bottom:20px;border:none;background:#0c0a09;color:#fff;border-radius:999px;padding:14px 18px;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer;z-index:99999;font-family:system-ui,sans-serif;";

    root.appendChild(panel);
    root.appendChild(launcher);

    const messagesEl = panel.querySelector("#soreya-chat-messages");
    const form = panel.querySelector("#soreya-chat-form");
    const input = panel.querySelector("#soreya-chat-input");

    function headers() {
      return {
        "Content-Type": "application/json",
        "X-Soreya-Form-Token": config.formToken,
      };
    }

    function renderMessages(messages) {
      messagesEl.innerHTML = "";
      messages.forEach(function (message) {
        const bubble = document.createElement("div");
        const incoming = message.direction === "incoming";
        bubble.style.cssText = "max-width:85%;align-self:" + (incoming ? "flex-start" : "flex-end") + ";background:" + (incoming ? "#fff" : "#0c0a09") + ";color:" + (incoming ? "#1c1917" : "#fff") + ";border:1px solid #e7e5e4;border-radius:12px;padding:8px 10px;font-size:14px;white-space:pre-wrap;";
        bubble.textContent = message.bodyText;
        messagesEl.appendChild(bubble);
        lastMessageAt = message.createdAt;
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function ensureSession() {
      if (sessionToken) return sessionToken;
      const response = await fetch(config.origin + "/api/website/chat/session", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          organizationSlug: config.organizationSlug,
          pageUrl: window.location.href,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.sessionToken) {
        throw new Error(payload.error || "Impossibile avviare la chat.");
      }
      sessionToken = payload.sessionToken;
      return sessionToken;
    }

    async function pollMessages() {
      if (!sessionToken) return;
      const url = new URL(config.origin + "/api/website/chat/messages");
      url.searchParams.set("sessionToken", sessionToken);
      if (lastMessageAt) url.searchParams.set("after", lastMessageAt);
      const response = await fetch(url.toString(), { headers: headers() });
      const payload = await response.json();
      if (!response.ok) return;
      if (Array.isArray(payload.messages) && payload.messages.length > 0) {
        const existing = messagesEl.querySelectorAll("[data-message-id]").length;
        payload.messages.forEach(function (message) {
          const bubble = document.createElement("div");
          bubble.dataset.messageId = message.id;
          const incoming = message.direction === "incoming";
          bubble.style.cssText = "max-width:85%;align-self:" + (incoming ? "flex-start" : "flex-end") + ";background:" + (incoming ? "#fff" : "#0c0a09") + ";color:" + (incoming ? "#1c1917" : "#fff") + ";border:1px solid #e7e5e4;border-radius:12px;padding:8px 10px;font-size:14px;white-space:pre-wrap;";
          bubble.textContent = message.bodyText;
          messagesEl.appendChild(bubble);
          lastMessageAt = message.createdAt;
        });
        if (existing === 0 && payload.messages.length > 0) {
          renderMessages(payload.messages);
        } else {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }
    }

    async function openChat() {
      panel.style.display = "flex";
      try {
        await ensureSession();
        await pollMessages();
        if (!pollTimer) {
          pollTimer = window.setInterval(pollMessages, config.pollIntervalMs);
        }
      } catch (error) {
        alert(error.message || "Chat non disponibile.");
      }
    }

    launcher.addEventListener("click", function () {
      if (panel.style.display === "flex") {
        panel.style.display = "none";
      } else {
        void openChat();
      }
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      try {
        await ensureSession();
        const response = await fetch(config.origin + "/api/website/chat/message", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            sessionToken: sessionToken,
            message: text,
            pageUrl: window.location.href,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Invio non riuscito.");
        }
        input.value = "";
        await pollMessages();
      } catch (error) {
        alert(error.message || "Invio non riuscito.");
      }
    });
  })();
</script>`;
}
