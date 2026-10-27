import { configurePrivacyBuildPhase } from '../plugins/withIosReleaseQuality.cjs';

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
