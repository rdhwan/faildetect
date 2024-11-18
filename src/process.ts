import { Connector } from "commlib";

/*
    Ping-Ack based Failure Detection
    - Children must sent INIT to parent to register themselves
    - Parent broadcasts PING message to all children
    - Children respond with PONG message
    - If parent doesn't receive PONG from a child within a period of time, it increments the suspicion level of that child
    - If suspicion level reaches a certain threshold, parent marks the child as failed

    In this case, if children doesn't reply to PING message in 5 seconds, it will be marked as failed.
    parent has suspicion level of each child, if it reaches 3, it will mark the child as failed.
*/

type ProcessT =
  | {
      type: "INIT" | "PING" | "PONG" | "PAYLOAD";
      sentAt: number;
    }
  | {
      type: "PAYLOAD";
      data: string;
    };

//
(async () => {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error(
      "Usage: node process.js <type: parent | children> <address: number>"
    );
    process.exit(1);
  }

  const type = args[0] as "parent" | "children";
  // parent always has address 1000, children has random address
  const address = type === "parent" ? 1000 : ~~(Math.random() * 1000);

  const connector = new Connector<ProcessT>({
    host: "broker.hivemq.com",
    port: 1883,
    topic: "pervasive-3/failure-detection",
    selfAddress: address,
  });

  console.log(
    `[Process]: Starting ${type} process with address ${address} ...`
  );

  // parent / coordinator process
  if (type === "parent") {
    const children = new Set<number>();
    const suspicion = new Map<number, number>();

    // message callback
    connector.on("message", (msg) => {
      if (msg.data.type === "INIT") {
        console.log(`[Parent]: Child ${msg.src} registered...`);
        children.add(msg.src);
        suspicion.set(msg.src, 0);

        // send ack to child
        connector.send(msg.src, { type: "INIT", sentAt: Date.now() });
      } else if (msg.data.type === "PONG") {
        console.log(`[Parent]: Received PONG from child ${msg.src}`);

        // check if sentAt is within 5 seconds
        const sentAt = msg.data.sentAt;
        const now = Date.now();

        if (now - sentAt <= 5000) {
          console.log(`[Parent]: Child ${msg.src} is alive`);
          suspicion.set(msg.src, 0);
        }
      }
    });

    // broadcast PING message to all children
    setInterval(() => {
      console.log(`[Parent]: Broadcasting PING to all children...`);
      connector.send(0, { type: "PING", sentAt: Date.now() });

      if (children.size === 0) {
        console.log(`[Parent]: No children registered...`);
        return;
      }

      // increment suspicion level of each child
      for (const child of children) {
        const s = suspicion.get(child) || 0;
        suspicion.set(child, s + 1);

        console.log(`[Parent]: Child ${child} suspicion level: ${s}`);

        if (s >= 3) {
          console.log(`[Parent]: Child ${child} is marked as failed`);
          children.delete(child);
          suspicion.delete(child);
        }
      }
    }, 5000);
  }

  if (type === "children") {
    let registered = false;
    console.log(`[Child]: Child ${address} started...`);

    connector.on("message", (msg) => {
      if (msg.data.type === "INIT") {
        console.log(`[Child]: Received INIT ack from parent`);
        registered = true;
      }
    });

    connector.on("broadcast", (msg) => {
      if (msg.data.type === "PING") {
        console.log(`[Child]: Received PING from parent, sending ack...`);
        connector.send(1000, { type: "PONG", sentAt: Date.now() });
      }
    });

    // try to register itself to parent until acknowledged
    while (!registered) {
      console.log(`[Child]: Trying to register to parent...`);
      connector.send(1000, { type: "INIT", sentAt: Date.now() });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
})();
