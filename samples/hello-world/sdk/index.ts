/**
 * Hello World - TypeScript SDK Sample
 * 
 * Demonstrates the basic usage of the Copilot SDK:
 * - Creating a client
 * - Starting a session
 * - Sending a prompt and receiving a response
 * - Proper cleanup
 */
import { CopilotClient } from "@github/copilot-sdk";
import { runSample, DEFAULT_MODEL } from "../../../shared/index.js";

async function main() {
  await runSample(
    {
      name: "Hello World (SDK)",
      description: "Basic Copilot SDK interaction",
    },
    async (client: CopilotClient) => {
      // Create a session with the model
      const session = await client.createSession({
        model: DEFAULT_MODEL,
      });

      // Set up event handling and completion promise
      const done = new Promise<void>((resolve) => {
        session.on((event) => {
          if (event.type === "assistant.message") {
            console.log("Response:", event.data.content);
          } else if (event.type === "session.idle") {
            resolve();
          }
        });
      });

      // Send the hello world prompt
      console.log("Sending: Hello, world!");
      await session.send({ prompt: "Hello, world!" });
      
      // Wait for completion
      await done;

      // Clean up session
      await session.destroy();
    }
  );
}

main().catch(console.error);
