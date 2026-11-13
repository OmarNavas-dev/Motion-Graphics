import {validateProject} from '../server-utils.mjs';
import {compileStoryboard as compile} from '../plugins/motion-graphics/skills/motion-graphics/scripts/compile-storyboard.mjs';

export function compileStoryboard(storyboard, script, options) {
  return compile(storyboard, script, {...options, validate:validateProject});
}
