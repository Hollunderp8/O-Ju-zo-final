
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChapterIntro = async (chapterName: string, characterName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma introdução curta e sombria (máximo 3 frases) para a fase "${chapterName}" no jogo "O Juízo dos Céus". O protagonista é "${characterName}". O tom deve ser apocalíptico, religioso e melancólico, estilo Blasphemous.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for maximum speed
      }
    });
    return response.text || "O céu sangra ouro enquanto a fé se torna nossa carrasca.";
  } catch (error) {
    console.error("Gemini failed:", error);
    return "A luz desce como uma lâmina sobre os justos e os pecadores.";
  }
};

export const getBossDialogue = async (bossName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O chefe "${bossName}" está prestes a lutar contra o jogador no jogo "O Juízo dos Céus". Escreva uma frase de desafio curta e teológica.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Sua existência é um erro no design divino. Deixe-me corrigi-lo.";
  } catch (error) {
    return "Sua fé é pequena demais para este julgamento.";
  }
};
