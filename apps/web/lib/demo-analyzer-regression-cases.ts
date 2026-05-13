export type DemoAnalyzerRegressionCase = {
  id: string;
  senderText: string;
  customerText: string;
  expected: {
    detectedIntent: "new_appointment";
    appointmentContextType: "new_appointment";
    reason: string | null;
    requestedDateTimeText: string | null;
    needsClarification: boolean;
    recommendedNextStep: "ask_clarification" | "propose_slots";
    alternativeLabels: string[];
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
  ];
}
