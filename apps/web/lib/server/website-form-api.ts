import { randomBytes } from "node:crypto";

export function generateWebsiteFormToken() {
  return randomBytes(24).toString("base64url");
}

export function buildWebsiteFormEmbedSnippet(origin: string, organizationSlug: string) {
  return `<form id="soreya-contact-form">
  <input name="name" placeholder="Nome" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Telefono" />
  <input name="service" placeholder="Servizio richiesto" />
  <textarea name="message" placeholder="Messaggio" required></textarea>
  <button type="submit">Invia richiesta</button>
</form>
<script>
  (function () {
    const form = document.getElementById("soreya-contact-form");
    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const data = new FormData(form);
      const response = await fetch("${origin}/api/website/form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Soreya-Form-Token": "INSERISCI_IL_TOKEN_DA_IMPOSTAZIONI"
        },
        body: JSON.stringify({
          organizationSlug: "${organizationSlug}",
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          service: data.get("service"),
          pageUrl: window.location.href,
          formName: "contact"
        })
      });
      const payload = await response.json();
      alert(payload.ok ? "Richiesta inviata. Lo studio ti ricontatterà." : (payload.error || "Invio non riuscito."));
    });
  })();
</script>`;
}
