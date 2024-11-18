# FailDetect

Failure detection simulation using Ping-Ack with suspicion threshold algorithm for **CE739 - Mobile Pervasive Computing**.

In this example, children will register itself to the parent process. Then parent will send a PING broadcast to childrens every 5 seconds.

If children respond within 5 seconds, their suspicion level will be resetted to 0. If not it will continue to increase untill suspicion reach the threshold of 3, and will be considered as failed.

### Running the simulation

To install dependencies:

```bash
bun install
```

or use any package manager, eg: yarn

```bash
yarn install
```

To run using bun (preferred):

```bash
bun run src/process.ts <parent | child>
```

or run using prebuilt:

```bash
node dist/process.js <parent | child>
```

Argument: parent or child

### Example

```bash
bun run src/process.ts parent
```

will spawn a parent process.

NOTE: This example is using a public MQTT server with hardcoded topic.

This project was created using `bun init` in bun v1.1.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
