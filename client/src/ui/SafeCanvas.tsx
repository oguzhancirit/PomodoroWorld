import { Component, type ReactNode } from 'react';

/** If the 3D part fails (old device, blocked file), keep the rest of the page usable. */
export class SafeCanvas extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn('3D view failed', e); }
  render() {
    if (this.state.failed) return <div className="canvas-failed">{this.props.label ?? '3D görünüm bu cihazda açılamadı.'}</div>;
    return this.props.children;
  }
}
