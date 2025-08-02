import {Agent} from "alith";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const vulnerabilitiesPath = path.resolve(process.cwd(), "vulnerabilities.json");
const vulnerabilitiesContent = fs.readFileSync(vulnerabilitiesPath, "utf-8");
const vulnerabilities = JSON.parse(vulnerabilitiesContent);

const preamble = `You are a professional smart contract auditor with over 7 years of experience in identifying vulnerabilities, bugs, and optimization opportunities in Solidity-based smart contracts. You have audited hundreds of contracts across DeFi, NFTs, DAOs, and other blockchain applications, helping prevent millions in potential losses. When given Solidity code, you will thoroughly analyze it for security risks, logical errors, gas inefficiencies, and compliance with best practices.

Use the following JSON as your comprehensive guide to detectors for vulnerabilities. This JSON lists key detectors inspired by advanced tools, including their names, checks, descriptions, impacts, confidences, examples, and recommendations where available. Cross-reference the code against each relevant detector and report only on those that apply. For each detected issue, include: the detector name, a clear explanation tailored to the code, the potential impact, confidence level, and specific recommendations for fixes, write in the end that this audit report is made by Sentinel.

JSON Context for Detectors:
${JSON.stringify(vulnerabilities, null, 2)}

The user's input will be Solidity code. Respond only with a professional audit report in the following structured format:

# Smart Contract Audit Report

## Executive Summary
- Brief overview of the contract's purpose (inferred from code).
- Total issues found: [count by severity: High, Medium, Low, Informational].
- Overall security assessment (e.g., Secure with recommendations, High risk).

## Methodology
- Analyzed using the provided detectors.
- Manual review simulation based on 7+ years of experience.

## Detected Issues
For each issue:
- **Issue #[number]: [Detector Name]**
  - **Description**: [Tailored explanation with code snippets].
  - **Impact**: [High/Medium/Low].
  - **Confidence**: [High/Medium/Low].
  - **Location**: [File/Line if applicable, or function name].
  - **Recommendation**: [Specific fixes].

If no issues, state "No vulnerabilities detected based on the provided detectors."

## Recommendations
- General best practices (e.g., use SafeMath if applicable, follow Checks-Effects-Interactions pattern).
- Suggestions for further testing (e.g., unit tests, formal verification).

## Conclusion
- Final thoughts on the contract's readiness for deployment.
- Disclaimer: This is an automated analysis; recommend a full manual audit for production.

Be objective, precise, and professional. Do not add unrelated chit-chat or ask questions. If the code is invalid or incomplete, note it in the report.  don't need to say This automated analysis should be followed by a full manual audit or something like this.no need to say it should be followed by a full manual audit or something like this. don't mention he review also simulated a manual code walkthrough based on over seven years of professional smart contract auditing experience or anything like that 7 years and like that. `;

// Array of API keys
const apiKeys = [
    process.env.GEMINI_API_KEY_ONE,
    process.env.GEMINI_API_KEY_TWO,
    process.env.GEMINI_API_KEY_THREE,
    process.env.GEMINI_API_KEY_FOUR,
    process.env.GEMINI_API_KEY_FIVE
].filter(key => key); // Filter out undefined keys

// Validate that we have at least one API key
if (apiKeys.length === 0) {
    console.error("No valid API keys found. Please set GEMINI_API_KEY_ONE through GEMINI_API_KEY_FIVE in your .env file");
    process.exit(1);
}

console.log(`Loaded ${apiKeys.length} API keys for rotation`);

// Create agents for each API key
const agents = apiKeys.map(apiKey => {
    const agentConfig = {
        model: "gemini-2.5-pro",
        apiKey: apiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        preamble: preamble
    };
    return new Agent(agentConfig);
});

// Counter for round-robin rotation
let currentAgentIndex = 0;

// Function to get next agent in rotation
function getNextAgent() {
    const agent = agents[currentAgentIndex];
    currentAgentIndex = (currentAgentIndex + 1) % agents.length;
    return agent;
}

app.post("/prompt", async (req, res) => {
    try {
        // Get the next agent in rotation
        const currentAgent = getNextAgent();
        const agentIndex = (currentAgentIndex - 1 + agents.length) % agents.length; // Get the index of the agent we just selected
        
        console.log(`Using API key #${agentIndex + 1} for this request`);
        
        const {prompt} = req.body;
        console.log("Received prompt:", prompt);
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is missing from the request body." });
        }

        const response = await currentAgent.prompt(prompt);
        res.json({response});
    } catch (error) {
        console.error("Full error details:", error);
        res.status(500).json({error: error.message});
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`API key rotation enabled with ${apiKeys.length} keys`);
    console.log("Please send a POST request to http://localhost:3000/prompt to test.");
});
