import { useState } from 'react';
import { AgentOrchestrator } from './agents/agentOrchestrator';
import { CleanupSuggestionsProvider } from './agents/providers/cleanupSuggestionsProvider';
import { OpenCodeDiagramProvider } from './agents/providers/openCodeDiagramProvider';
import { ReviewModeProvider } from './agents/providers/reviewModeProvider';
import { SelectionRewriteProvider } from './agents/providers/selectionRewriteProvider';
import { AppShell } from './app/AppShell';
import { useAppShellState } from './app/useAppShellState';
import { useAppWorkspace } from './app/useAppWorkspace';
import { useCanvas } from './hooks/useCanvas';
import { useKeyboard } from './hooks/useKeyboard';
import { useWorkspaceStore } from './stores/workspaceStore';
import './App.css';

function App() {
  const [agentOrchestrator] = useState(
    () =>
      new AgentOrchestrator([
        new ReviewModeProvider(),
        new CleanupSuggestionsProvider(),
        new SelectionRewriteProvider(),
        new OpenCodeDiagramProvider(),
      ])
  );

  const workspaceStore = useWorkspaceStore();
  const activeWorkspace = useAppWorkspace(workspaceStore);
  const canvas = useCanvas(activeWorkspace.id);
  const { shellProps, keyboardBindings } = useAppShellState({
    activeWorkspace,
    workspaceStore,
    canvas,
    agentOrchestrator,
  });

  useKeyboard(keyboardBindings);

  return <AppShell {...shellProps} />;
}

export default App;
