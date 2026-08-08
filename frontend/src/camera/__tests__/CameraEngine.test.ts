import { CameraEngineAdapter } from '../CameraEngineAdapter';
import { CameraProvider } from '../CameraProvider';
import { PoseFrameV1 } from '../CameraTypes';

describe('PetalPath Camera Engine v3 - Unit & Integration Tests', () => {
  it('should instantiate CameraEngineAdapter with UNINITIALIZED state', () => {
    const adapter = new CameraEngineAdapter();
    expect(adapter.getState()).toBe('UNINITIALIZED');
  });

  it('should safely register and unregister onPoseFrame listeners', () => {
    const adapter = new CameraEngineAdapter();
    let receivedFrame: PoseFrameV1 | null = null;
    const listener = (frame: PoseFrameV1) => {
      receivedFrame = frame;
    };

    const unsubscribe = adapter.onPoseFrame(listener);
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    expect(receivedFrame).toBeNull();
  });
});
