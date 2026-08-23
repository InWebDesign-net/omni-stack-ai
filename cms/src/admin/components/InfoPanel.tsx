import * as React from 'react';

interface InfoPanelProps {
  attribute?: {
    options?: {
      /** The explanation itself. Blank lines separate paragraphs; `- ` starts a bullet. */
      body?: string;
      /** Optional heading above it. */
      heading?: string;
      /** `note` explains, `warning` is for something that cannot be undone. */
      tone?: 'note' | 'warning';
    };
  };
}

/**
 * Documentation rendered inside the edit form.
 *
 * A custom field that never asks for input: it renders what its schema entry
 * carries and stores nothing. The point is that the explanation sits where the
 * decision is made, rather than in a README nobody has a reason to open while
 * looking at a switch labelled "wipe user content".
 */
const InfoPanel: React.FC<InfoPanelProps> = ({ attribute }) => {
  const options = attribute?.options || {};
  const tone = options.tone === 'warning' ? 'warning' : 'note';
  const body = options.body || '';

  const palette = tone === 'warning'
    ? { border: '#f0b429', background: 'rgba(240, 180, 41, 0.08)', heading: '#b45309' }
    : { border: '#7b79ff', background: 'rgba(123, 121, 255, 0.07)', heading: '#4945ff' };

  // Paragraphs on blank lines, bullets on "- ". Deliberately not a markdown
  // renderer: this is a handful of sentences in a schema file, and a parser
  // would be more surface than the thing it renders.
  const blocks = body.split(/\n\s*\n/).filter(Boolean);

  return (
    <div
      style={{
        borderLeft: `3px solid ${palette.border}`,
        background: palette.background,
        borderRadius: '4px',
        padding: '12px 16px',
        margin: '4px 0 8px',
      }}
    >
      {options.heading && (
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: palette.heading, marginBottom: '8px' }}>
          {options.heading}
        </div>
      )}
      {blocks.map((block, index) => {
        const lines = block.split('\n');
        const isList = lines.every((line) => line.trim().startsWith('- '));

        if (isList) {
          return (
            <ul key={index} style={{ margin: '0 0 8px', paddingLeft: '18px', fontSize: '0.8125rem', lineHeight: 1.6 }}>
              {lines.map((line, i) => (
                <li key={i}>{line.trim().slice(2)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} style={{ margin: '0 0 8px', fontSize: '0.8125rem', lineHeight: 1.6 }}>
            {block}
          </p>
        );
      })}
    </div>
  );
};

export default InfoPanel;
