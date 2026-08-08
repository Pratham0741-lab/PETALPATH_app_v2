import React, { createContext, useContext, useState } from 'react';
import { CameraEngineMode } from './CameraTypes';

interface CameraContextValue {
  engineMode: CameraEngineMode;
  setEngineMode: (mode: CameraEngineMode) => void;
}

const CameraContext = createContext<CameraContextValue>({
  engineMode: 'movenet',
  setEngineMode: () => {},
});

export const CameraProvider: React.FC<{ children: React.ReactNode; initialMode?: CameraEngineMode }> = ({
  children,
  initialMode = 'movenet',
}) => {
  const [engineMode, setEngineMode] = useState<CameraEngineMode>(initialMode);

  return (
    <CameraContext.Provider value={{ engineMode, setEngineMode }}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCameraEngineMode = () => useContext(CameraContext);
