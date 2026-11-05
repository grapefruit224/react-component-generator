import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  return (
    <div className="preview">
      <LiveProvider code={code} noInline>
        <div className="preview-stage">
          <ReactLivePreview />
        </div>
        <LiveError className="preview-error" />
      </LiveProvider>
    </div>
  );
}
