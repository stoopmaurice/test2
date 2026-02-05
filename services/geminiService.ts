
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, Player, GameResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The next part of the story describing the results of the player's action.",
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 4 short choices for the player to take next.",
    },
    healthChange: {
      type: Type.NUMBER,
      description: "Positive or negative change to the player's health (e.g., -10 or +5).",
    },
    xpReward: {
      type: Type.NUMBER,
      description: "Experience points gained from this interaction.",
    },
    inventoryUpdate: {
      type: Type.OBJECT,
      properties: {
        add: { type: Type.ARRAY, items: { type: Type.STRING } },
        remove: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["add", "remove"],
    },
    isGameOver: {
      type: Type.BOOLEAN,
      description: "True if the player died or reached a definitive bad/good ending.",
    },
    gameOverReason: {
      type: Type.STRING,
      description: "Optional summary of how the game ended.",
    },
  },
  required: ["narrative", "choices", "healthChange", "xpReward", "inventoryUpdate", "isGameOver"],
};

export const startNewGame = async (player: Player): Promise<GameResponse> => {
  const prompt = `Start a new game for a player named ${player.name} in the theme of ${player.theme}. 
  Describe the initial scene vividly and provide the first set of choices. 
  The player starts with: Health ${player.health}, Inventory: ${player.inventory.join(", ")}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `You are an expert Game Master. Create immersive, atmospheric text adventures. 
      Tailor the tone to the chosen theme:
      - Cyberpunk: Gritty, neon, tech-heavy.
      - Fantasy: Epic, magical, archaic.
      - Space Horror: Claustrophobic, mysterious, terrifying.
      - Apocalypse: Desolate, harsh, survival-focused.
      Always maintain player stats and inventory logic.`,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text);
};

export const processAction = async (
  player: Player,
  action: string,
  history: string[]
): Promise<GameResponse> => {
  const prompt = `The player decided to: "${action}".
  Current Player State:
  - Health: ${player.health}
  - Level: ${player.level}
  - XP: ${player.xp}
  - Inventory: ${player.inventory.join(", ")}
  - Theme: ${player.theme}

  Recent history context: ${history.join(" -> ")}

  Generate the next narrative beat and consequences.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `Continue the adventure. Be creative and react logically to the player's choices. 
      If health drops to 0 or below, set isGameOver to true. 
      If they do something clever, reward XP or items.`,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text);
};
