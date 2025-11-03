export function Progress({ value = 0 }: { value?: number }) {
    return (
      <div className="w-full h-2 bg-muted rounded">
        <div className="h-2 bg-primary rounded" style={{ width: `${value}%` }} />
      </div>
    );
  }
  