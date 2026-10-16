export default function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <div role="alert" className="errors">
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}
