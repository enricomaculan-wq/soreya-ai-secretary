#!/usr/bin/env python3
"""Checklist stampabile: attivare OAuth Google Calendar."""

from pathlib import Path
from typing import List, Optional

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "checklist-oauth-google-calendar.pdf"


class ChecklistPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)
        self.cell(0, 9, "OAuth Google Calendar - compiti tuoi", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(
            0,
            5,
            "Spunta ogni voce. Supabase e organizzazione Prova srl gia pronti.",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.ln(2)
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Pagina {self.page_no()}/{{nb}}", align="C")


def section(pdf: ChecklistPDF, title: str) -> None:
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT", fill=True)
    pdf.ln(1)


def item(pdf: ChecklistPDF, text: str, sub: Optional[List[str]] = None) -> None:
    w = pdf.epw
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(w, 5.5, f"[ ] {text}")
    if sub:
        pdf.set_font("Helvetica", "", 8.5)
        for line in sub:
            pdf.set_x(pdf.l_margin + 6)
            pdf.multi_cell(w - 6, 4.8, f"- {line}")
    pdf.ln(0.5)


def code_block(pdf: ChecklistPDF, lines: List[str]) -> None:
    pdf.set_font("Courier", "", 8.5)
    pdf.set_fill_color(250, 250, 250)
    for line in lines:
        pdf.set_x(pdf.l_margin + 6)
        pdf.multi_cell(pdf.epw - 6, 4.5, line, fill=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(1)


def build() -> None:
    pdf = ChecklistPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    section(pdf, "A. Google Cloud Console")
    item(pdf, "Accedi a console.cloud.google.com e seleziona il progetto")
    item(pdf, "Abilita Google Calendar API (Libreria API)")
    item(pdf, "Configura Schermata consenso OAuth (Esterna o Interna)")
    item(pdf, "Aggiungi il tuo Gmail come utente di test")
    item(
        pdf,
        "Credenziali -> Crea credenziali -> ID client OAuth -> Applicazione web",
        [
            "Nome es.: Soreya Calendar local",
            "Redirect URI (copia identico):",
        ],
    )
    code_block(
        pdf,
        [
            "http://localhost:3000/api/calendar/google/callback",
        ],
    )
    item(
        pdf,
        "Copia ID client e Segreto client (GOCSPX-...)",
        [
            "Se non vedi il secret: apri il client -> Rigenera secret",
        ],
    )

    section(pdf, "B. File apps/web/.env.local")
    item(pdf, "Aggiungi le variabili (poi riavvia il server)")
    code_block(
        pdf,
        [
            "GOOGLE_CLIENT_ID=....apps.googleusercontent.com",
            "GOOGLE_CLIENT_SECRET=GOCSPX-....",
            "GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback",
            "CALENDAR_TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>",
        ],
    )

    section(pdf, "C. Nell app Soreya")
    item(pdf, "Server avviato: npm run dev su porta 3000")
    item(pdf, "Login su http://localhost:3000/login")
    item(pdf, "Impostazioni -> Calendari -> Connetti Google Calendar")
    item(pdf, "Autorizza con l account Google del calendario studio")
    item(pdf, "Torna su Settings con messaggio google-connected")
    item(pdf, "Clicca Sync now e verifica eventi in cache")

    section(pdf, "D. Verifica OK")
    item(pdf, "./scripts/verify-real-setup.sh -> googleCalendar: true")
    item(pdf, "Impostazioni -> Stato sistema -> Google Calendar configured")

    section(pdf, "Errori frequenti")
    item(pdf, "redirect_uri_mismatch -> URI Google diversa da GOOGLE_REDIRECT_URI")
    item(pdf, "Missing GOOGLE_CLIENT_ID -> env mancante o server non riavviato")
    item(pdf, "access_denied -> Gmail non in utenti test OAuth")
    item(pdf, "401 su Connetti -> non loggato su /login")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    build()
