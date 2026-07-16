import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { adaptiveCurriculumService } from './adaptive-curriculum.service.js';
import {
  searchSkillsSchema,
  createCurriculumGradeSchema,
  updateCurriculumGradeSchema,
  createCurriculumDomainSchema,
  updateCurriculumDomainSchema,
  skillIdParamSchema,
  createSkillTagSchema,
  createSkillActivitySchema,
  updateSkillActivitySchema,
  createSkillAssessmentSchema,
  updateSkillAssessmentSchema,
  domainBySubjectSchema,
  paginationSchema,
} from './adaptive-curriculum.validator.js';
import { ValidationError } from '../../utils/errors.js';

export class AdaptiveCurriculumController {
  async searchSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = searchSkillsSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const { page, limit, tags, ...rest } = parsed.data;
      const filters = {
        ...rest,
        ...(tags ? { tags: tags.split(',').map((t: string) => t.trim()) } : {}),
      };
      const result = await adaptiveCurriculumService.searchSkills(filters, { page, limit });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSkillDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Invalid skill ID', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.getSkillDetail(parsed.data.id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getGrades(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adaptiveCurriculumService.getGrades();

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getGrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Grade ID is required');
      }

      const result = await adaptiveCurriculumService.getGrade(id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createGrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createCurriculumGradeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.createGrade(parsed.data);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateGrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Grade ID is required');
      }

      const parsed = updateCurriculumGradeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.updateGrade(id, parsed.data);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteGrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Grade ID is required');
      }

      await adaptiveCurriculumService.deleteGrade(id);

      return res.status(200).json({ success: true, data: { message: 'Grade deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async getDomains(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adaptiveCurriculumService.getDomains();

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDomain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Domain ID is required');
      }

      const result = await adaptiveCurriculumService.getDomain(id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDomainsBySubject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = domainBySubjectSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.getDomainsBySubject(parsed.data.subjectId);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createDomain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createCurriculumDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.createDomain(parsed.data);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateDomain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Domain ID is required');
      }

      const parsed = updateCurriculumDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.updateDomain(id, parsed.data);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteDomain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Domain ID is required');
      }

      await adaptiveCurriculumService.deleteDomain(id);

      return res.status(200).json({ success: true, data: { message: 'Domain deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async getSkillTags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.getSkillTags(parsed.data.id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addSkillTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsedId = skillIdParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        throw new ValidationError('Validation failed', parsedId.error.format());
      }

      const parsedBody = createSkillTagSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ValidationError('Validation failed', parsedBody.error.format());
      }

      const result = await adaptiveCurriculumService.addSkillTag(parsedId.data.id, parsedBody.data.tag);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeSkillTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const { tagId } = req.params;
      if (!tagId || typeof tagId !== 'string') {
        throw new ValidationError('Tag ID is required');
      }

      await adaptiveCurriculumService.removeSkillTag(parsed.data.id, tagId);

      return res.status(200).json({ success: true, data: { message: 'Skill tag removed successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async getSkillActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.getSkillActivities(parsed.data.id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createSkillActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsedId = skillIdParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        throw new ValidationError('Validation failed', parsedId.error.format());
      }

      const parsedBody = createSkillActivitySchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ValidationError('Validation failed', parsedBody.error.format());
      }

      const result = await adaptiveCurriculumService.createSkillActivity(parsedId.data.id, parsedBody.data);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSkillActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.params;
      if (!activityId || typeof activityId !== 'string') {
        throw new ValidationError('Activity ID is required');
      }

      const parsed = updateSkillActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.updateSkillActivity(activityId, parsed.data);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteSkillActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.params;
      if (!activityId || typeof activityId !== 'string') {
        throw new ValidationError('Activity ID is required');
      }

      await adaptiveCurriculumService.deleteSkillActivity(activityId);

      return res.status(200).json({ success: true, data: { message: 'Skill activity deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async getSkillAssessments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = skillIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.getSkillAssessments(parsed.data.id);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createSkillAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsedId = skillIdParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        throw new ValidationError('Validation failed', parsedId.error.format());
      }

      const parsedBody = createSkillAssessmentSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ValidationError('Validation failed', parsedBody.error.format());
      }

      const result = await adaptiveCurriculumService.createSkillAssessment(parsedId.data.id, parsedBody.data);

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSkillAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assessmentId } = req.params;
      if (!assessmentId || typeof assessmentId !== 'string') {
        throw new ValidationError('Assessment ID is required');
      }

      const parsed = updateSkillAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.format());
      }

      const result = await adaptiveCurriculumService.updateSkillAssessment(assessmentId, parsed.data);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteSkillAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assessmentId } = req.params;
      if (!assessmentId || typeof assessmentId !== 'string') {
        throw new ValidationError('Assessment ID is required');
      }

      await adaptiveCurriculumService.deleteSkillAssessment(assessmentId);

      return res.status(200).json({ success: true, data: { message: 'Skill assessment deleted successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw new ValidationError('Request body must be a non-null object');
      }

      const result = await adaptiveCurriculumService.bulkImport(req.body);

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const adaptiveCurriculumController = new AdaptiveCurriculumController();
