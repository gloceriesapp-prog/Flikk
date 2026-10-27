import { configurePrivacyBuildPhase, configureRuntimeBuildPhase } from '../plugins/withIosReleaseQuality.cjs';

it('checks the final bundled runtimes after JS bundling, before signing', () => {
  const firstTarget = { buildPhases: [
    { value: 'BUNDLE', comment: 'Bundle React Native code and images' },
    { value: 'EMBED', comment: '[CP] Embed Pods Frameworks' },
  ] };
  let added = false;
  const project = {
    getFirstTarget: () => ({ uuid: 'APP', firstTarget }),
    pbxItemByComment: () => added,
    addBuildPhase: (_files: unknown[], _kind: string, _name: string, _target: string, options: { shellScript: string }) => {
      expect(options.shellScript).toContain('$DERIVED_FILE_DIR/main.jsbundle.map');
      added = true;
      firstTarget.buildPhases.push({ value: 'VERIFY', comment: 'Runtime verification' });
      return { uuid: 'VERIFY' };
    },
  };
  configureRuntimeBuildPhase(project);
  configureRuntimeBuildPhase(project);
  expect(firstTarget.buildPhases.map(phase => phase.value)).toEqual(['BUNDLE', 'VERIFY', 'EMBED']);
});

it('runs the SDK metadata check before resource/signing work and adds it only once', () => {
  const firstTarget = { buildPhases: [{ value: 'SOURCES' }, { value: 'RESOURCES' }] };
  const phases: Record<string, unknown> = {};
  const addBuildPhase = jest.fn((_files, _kind, name, target, options) => {
    expect(target).toBe('APP');
    expect(options.shellScript).toContain('--normalize-razorpay');
    phases.PRIVACY = { name };
    firstTarget.buildPhases.push({ value: 'PRIVACY' });
    return { uuid: 'PRIVACY' };
  });
  const project = {
    getFirstTarget: () => ({ uuid: 'APP', firstTarget }),
    pbxItemByComment: (name: string) => Object.values(phases).find(phase => (phase as {name: string}).name === name),
    addBuildPhase,
  };
  configurePrivacyBuildPhase(project);
  configurePrivacyBuildPhase(project);
  expect(addBuildPhase).toHaveBeenCalledTimes(1);
  expect(firstTarget.buildPhases.map(phase => phase.value)).toEqual(['PRIVACY', 'SOURCES', 'RESOURCES']);
});
