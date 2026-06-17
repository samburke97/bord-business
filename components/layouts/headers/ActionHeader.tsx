interface ActionHeaderProps {
  title?: string;
}

export default function ActionHeader({ title }: ActionHeaderProps) {
  return <div>{title && <h1>{title}</h1>}</div>;
}
