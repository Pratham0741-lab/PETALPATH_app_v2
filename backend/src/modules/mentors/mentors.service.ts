import { mentorsRepository } from './mentors.repository.js';
import { NotFoundError } from '../../utils/errors.js';

export class MentorsService {
  async getAllMentors() {
    return mentorsRepository.findAll();
  }

  async getMentorById(id: string) {
    const mentor = await mentorsRepository.findById(id);
    if (!mentor) {
      throw new NotFoundError('Mentor not found');
    }
    return mentor;
  }
}

export const mentorsService = new MentorsService();
