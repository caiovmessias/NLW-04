import { Request, Response } from 'express';
import { getCustomRepository, getConnectionOptions } from 'typeorm';
import { UsersRepository } from '../repositories/UsersRepository';
import { SurveysRepository } from '../repositories/SurveysRepository';
import { SurveysUsersRepository } from '../repositories/SurveysUsersRepository';
import SendMailService from '../services/SendMailService';
import { resolve } from 'path';
import { AppError } from '../errors/AppError';

class SendMailController {
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body;

    const usersRepository = getCustomRepository(UsersRepository);
    const surveyRepository = getCustomRepository(SurveysRepository);
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

    const user = await usersRepository.findOne({ email });

    if (!user) {
      throw new AppError('User does not exists!');
    }

    const survey = await surveyRepository.findOne({ id: survey_id });

    if (!survey) {
      throw new AppError('Survey does not exists!');
    }

    const npsPath = resolve(__dirname, '..', 'views', 'emails', 'npsMail.hbs');

    const surveyUserAlreadExists = await surveysUsersRepository.findOne({
      where: { user_id: user.id, value: null },
      relations: ['user', 'survey'],
    });

    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      id: '',
      link: process.env.URL_MAIL,
    };

    if (surveyUserAlreadExists) {
      variables.id = surveyUserAlreadExists.id;
      await SendMailService.execute(email, survey.title, variables, npsPath);
      return response.json(surveyUserAlreadExists);
    }

    const surveyUser = surveysUsersRepository.create({
      user_id: user.id,
      survey_id,
    });

    await surveysUsersRepository.save(surveyUser);
    variables.id = surveyUser.id;
    await SendMailService.execute(email, survey.title, variables, npsPath);

    return response.json(surveyUser);
  }
}

export { SendMailController };