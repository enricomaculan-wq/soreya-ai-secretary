#!/usr/bin/env python3
"""Generates a printable PDF checklist with user-only tasks for real integration test."""

from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "checklist-test-reale-tuoi-compiti.pdf"


class ChecklistPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "Soreya - Checklist test reale (compiti tuoi)", ln=True)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(0, 6, "Calendar + Gmail + WhatsApp Business | stampa e spunta man mano", ln=True)
        self.ln(2)
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Pagina {self.page_no()}/{{nb}}", align="C")


def section_title(pdf: ChecklistPDF, title: str) -> None:
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(0, 8, title, ln=True, fill=True)
    pdf.ln(1)


def task(pdf: ChecklistPDF, number: str, title: str, lines: list[str]) -> None:
    width = pdf.epw
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(width, 6, f"[ ] {number}. {title}")
    pdf.set_font("Helvetica", "", 9)
    for line in lines:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(width, 5, f"      - {line}")
    pdf.ln(1)


def note_box(pdf: ChecklistPDF, text: str) -> None:
    width = pdf.epw
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(width, 5, text)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)


def build_pdf() -> None:
    pdf = ChecklistPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    note_box(
        pdf,
        "Obiettivo: test reale in lettura + bozze + approvazione (dry-run). "
        "Il flusso vero passa da Login, Impostazioni e Dashboard. "
        "La demo in /app resta simulata.",
    )

    section_title(pdf, "Fase 0 - Base")
    task(
        pdf,
        "1",
        "Supabase",
        [
            "Crea un progetto Supabase dedicato (non demo).",
            "Applica tutte le migration in supabase/migrations/ in ordine di filename.",
            "Recupera: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.",
        ],
    )
    task(
        pdf,
        "2",
        "File .env.local (apps/web/)",
        [
            "Inserisci chiavi Supabase + OPENAI_API_KEY + OPENAI_MODEL.",
            "Genera chiavi casuali lunghe: CALENDAR_TOKEN_ENCRYPTION_KEY, EMAIL_TOKEN_ENCRYPTION_KEY, WHATSAPP_TOKEN_ENCRYPTION_KEY.",
            "Imposta NEXT_PUBLIC_USE_DEMO_DATA=false.",
        ],
    )
    task(
        pdf,
        "3",
        "Login e organizzazione",
        [
            "Crea un utente di test.",
            "Accedi a /login e completa onboarding: nome studio + timezone (es. Europe/Rome).",
        ],
    )
    task(
        pdf,
        "4",
        "Brain / listino studio",
        [
            "In Impostazioni configura servizi, durate, prezzi e regole.",
            "Oppure, se preferisci: npm run setup:brain (richiede Supabase configurato).",
        ],
    )

    section_title(pdf, "Fase 1 - Google Calendar + Gmail")
    task(
        pdf,
        "5",
        "Google Cloud Console",
        [
            "Abilita Google Calendar API e Gmail API.",
            "Configura OAuth consent screen (utenti test se app non verificata).",
            "Crea client OAuth (Web) con redirect autorizzati per locale e produzione.",
        ],
    )
    task(
        pdf,
        "6",
        "Variabili Google in .env.local",
        [
            "Calendar: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.",
            "Gmail (consigliato dedicato): GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, GOOGLE_GMAIL_REDIRECT_URI.",
            "Redirect locali attesi:",
            "  http://localhost:3000/api/calendar/google/callback",
            "  http://localhost:3000/api/email/google/callback",
        ],
    )
    task(
        pdf,
        "7",
        "Collegamento e sync",
        [
            "Impostazioni -> Calendari -> Connetti Google.",
            "Impostazioni -> Email -> Connetti Gmail.",
            "Lancia sync manuale e verifica che eventi/email entrino in cache.",
        ],
    )

    section_title(pdf, "Fase 2 - WhatsApp Business")
    task(
        pdf,
        "8",
        "Meta Business / WhatsApp Cloud API",
        [
            "Crea o usa app Meta con WhatsApp Cloud API.",
            "Collega numero Business e recupera Phone Number ID + Business Account ID.",
            "Genera access token e webhook verify token.",
            "Aggiungi numeri tester (obbligatorio in modalita dev).",
        ],
    )
    task(
        pdf,
        "9",
        "URL HTTPS pubblico per webhook",
        [
            "Scegli deploy (es. Vercel) oppure tunnel (ngrok / Cloudflare Tunnel).",
            "Webhook Meta da puntare a: https://TUO-DOMINIO/api/whatsapp/webhook",
            "Nota: localhost da solo non riceve webhook Meta.",
        ],
    )
    task(
        pdf,
        "10",
        "Variabili WA + collegamento in app",
        [
            "Compila in .env.local: WHATSAPP_CLOUD_API_VERSION, WHATSAPP_APP_ID, WHATSAPP_APP_SECRET,",
            "WHATSAPP_VERIFY_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN.",
            "Impostazioni -> WhatsApp -> collega il numero (Phone Number ID -> organizzazione).",
        ],
    )

    section_title(pdf, "Fase 3 - Verifica read-only")
    task(
        pdf,
        "11",
        "Health check",
        [
            "Apri GET /api/health e verifica provider configured.",
            "In Impostazioni controlla pannello Stato sistema.",
        ],
    )
    task(
        pdf,
        "12",
        "Smoke test senza invii reali",
        [
            "Invia messaggio WA al numero Business (da numero tester).",
            "Esegui sync Gmail.",
            "Verifica bozze in Dashboard / Inbox (non solo in /app demo).",
            "Approva o ignora bozze: resta in dry-run (nessun invio reale).",
        ],
    )

    section_title(pdf, "Cosa NON e obbligatorio ora")
    note_box(
        pdf,
        "- Invio email Gmail reale: non ancora implementato nel codice.\n"
        "- Scrittura appuntamenti su Google Calendar: non ancora implementata.\n"
        "- Invio WA reale: possibile solo in fase successiva, con flag espliciti e numeri tester.",
    )

    section_title(pdf, "Ordine consigliato")
    note_box(pdf, "1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
