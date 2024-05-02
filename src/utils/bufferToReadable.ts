import { Readable } from "stream";

export default function bufferToReadable(buffer: Buffer) {
  const readable = new Readable({
      read() {}
  });
  readable.push(buffer);
  readable.push(null);  // Signifies the end of the stream (EOF)
  return readable;
}
