export type DemoAnalyzerRegressionCase = {
  id: string;
  senderText: string;
  customerText: string;
  expected: {
    detectedIntent:
      | "new_appointment"
      | "reschedule_appointment"
      | "delay_notice"
      | "manual_review";
    appointmentContextType:
      | "new_appointment"
      | "reschedule_existing"
      | "delay_existing"
      | "unknown";
    reason: string | null;
    requestedDateTimeText: string | null;
    needsClarification: boolean;
    recommendedNextStep:
      | "ask_clarification"
      | "propose_slots"
      | "propose_reschedule"
      | "approve_reply"
      | "manual_review";
    alternativeLabels: string[];
    suggestedReply?: string;
  };
};

export function getDemoAnalyzerRegressionCases(): DemoAnalyzerRegressionCase[] {
  return [
    {
      id: "tomorrow-quote",
      senderText: "giacomo 3401234567",
      customerText: "Buongiorno avete disponibilità per domani mi serve un appuntamento per un preventivo",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: "preventivo",
        requestedDateTimeText: "domani",
        needsClarification: false,
        recommendedNextStep: "propose_slots",
        alternativeLabels: ["domani alle 9:30", "domani alle 11:00"],
      },
    },
    {
      id: "tomorrow-dental-cleaning",
      senderText: "giacomo 3401234567",
      customerText: "Buongiorno avete disponibilità per domani mi serve un appuntamento per igiene dentale",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: "igiene dentale",
        requestedDateTimeText: "domani",
        needsClarification: false,
        recommendedNextStep: "propose_slots",
        alternativeLabels: ["domani alle 9:30", "domani alle 11:00"],
      },
    },
    {
      id: "tomorrow-afternoon-quote",
      senderText: "",
      customerText: "Ciao, posso passare domani pomeriggio per un preventivo?",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: "preventivo",
        requestedDateTimeText: "domani pomeriggio",
        needsClarification: false,
        recommendedNextStep: "propose_slots",
        alternativeLabels: ["domani alle 16:30", "domani alle 17:15"],
      },
    },
    {
      id: "billing-operator-attention",
      senderText: "giacomo 3403312345",
      customerText: "Buongiorno, ho ricevuto la fattura ma l'importo non mi torna. Potete controllare?",
      expected: {
        detectedIntent: "manual_review",
        appointmentContextType: "unknown",
        reason: null,
        requestedDateTimeText: null,
        needsClarification: false,
        recommendedNextStep: "manual_review",
        alternativeLabels: [],
        suggestedReply: "",
      },
    },
    {
      id: "first-availability-hygiene-cost",
      senderText: "giacomo 3403312345",
      customerText:
        "Buongiorno, mi date la prima disponibilità per una pulizia dentale e il relativo costo?",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: "igiene dentale",
        requestedDateTimeText: "prima disponibilità utile",
        needsClarification: false,
        recommendedNextStep: "propose_slots",
        alternativeLabels: [],
        suggestedReply:
          "posso proporle come prima disponibilità utile",
      },
    },
    {
      id: "first-availability-cavity-urgent",
      senderText: "",
      customerText: "Ciao sono Giacomo, mi sai dire la prima disponibilità utile per una urgenza relativa ad una carie?",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: "urgenza per carie",
        requestedDateTimeText: "prima disponibilità utile",
        needsClarification: false,
        recommendedNextStep: "propose_slots",
        alternativeLabels: ["oggi alle 16:30", "domani alle 9:30"],
      },
    },
    {
      id: "tomorrow-afternoon-missing-reason",
      senderText: "",
      customerText: "Ciao avete disponibilità per domani pomeriggio?",
      expected: {
        detectedIntent: "new_appointment",
        appointmentContextType: "new_appointment",
        reason: null,
        requestedDateTimeText: "domani pomeriggio",
        needsClarification: true,
        recommendedNextStep: "ask_clarification",
        alternativeLabels: [],
      },
    },
    {
      id: "reschedule-next-week",
      senderText: "giacomo 34032165487",
      customerText:
        "Ciao domani ho un appuntamento me lo puoi spostare alla prima disponibilità della settimana prossima?",
      expected: {
        detectedIntent: "reschedule_appointment",
        appointmentContextType: "reschedule_existing",
        reason: null,
        requestedDateTimeText: "la prima disponibilità della prossima settimana",
        needsClarification: false,
        recommendedNextStep: "propose_reschedule",
        alternativeLabels: [],
      },
    },
    {
      id: "reschedule-day-after-tomorrow-same-time",
      senderText: "giacomo 34012345678",
      customerText:
        "ciao, mi sposti l'appuntamento che ho domani a dopo domani allo stesso orario?",
      expected: {
        detectedIntent: "reschedule_appointment",
        appointmentContextType: "reschedule_existing",
        reason: null,
        requestedDateTimeText: "dopodomani alle 15:00",
        needsClarification: false,
        recommendedNextStep: "propose_reschedule",
        alternativeLabels: ["dopodomani alle 9:30", "dopodomani alle 11:00"],
        suggestedReply:
          "Certo Giacomo, possiamo spostare l'appuntamento a dopodomani. Purtroppo dopodomani alle 15:00 non è disponibile: posso proporti alle 9:30 oppure alle 11:00. Quale orario preferisci?",
      },
    },
    {
      id: "reschedule-tomorrow",
      senderText: "gigi 3401234567",
      customerText: "Vorrei posticipare l’incontro di domani",
      expected: {
        detectedIntent: "reschedule_appointment",
        appointmentContextType: "reschedule_existing",
        reason: null,
        requestedDateTimeText: "domani alle 15:00",
        needsClarification: false,
        recommendedNextStep: "propose_reschedule",
        alternativeLabels: ["domani alle 16:30", "dopodomani alle 9:30"],
        suggestedReply: "Certo Gigi, possiamo posticipare l’incontro di domani. Ti propongo domani alle 16:30 oppure dopodomani alle 9:30. Quale orario preferisci?",
      },
    },
    {
      id: "traffic-call-delay",
      senderText: "gigi 3401234567",
      customerText: "Scusa sono bloccata nel traffico, riesci a sentirmi più tardi?",
      expected: {
        detectedIntent: "delay_notice",
        appointmentContextType: "delay_existing",
        reason: null,
        requestedDateTimeText: null,
        needsClarification: false,
        recommendedNextStep: "approve_reply",
        alternativeLabels: [],
        suggestedReply: "Certo Gigi, nessun problema. Sentiamoci tra circa un’oretta, così abbiamo più margine. Ti va bene?",
      },
    },
    {
      id: "running-late-call-delay",
      senderText: "gigi 3401234567",
      customerText: "Sono in ritardo di 20 minuti, possiamo sentirci più tardi?",
      expected: {
        detectedIntent: "delay_notice",
        appointmentContextType: "delay_existing",
        reason: null,
        requestedDateTimeText: null,
        needsClarification: false,
        recommendedNextStep: "approve_reply",
        alternativeLabels: [],
      },
    },
  ];
}
