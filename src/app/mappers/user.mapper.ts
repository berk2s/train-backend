/**
 * @module app.mappers
 */

import { BaseUserDocument } from '@app/model/user/BaseUser'
import { AthleteUserDocument } from '@app/model/user/Athlete'
import {
  AthleteResponse,
  PTResponse,
  UserResponse,
} from '@app/types/response.types'
import { PersonalTrainerDocument } from '@app/model/user/PersonalTrainer'

export abstract class UserMapper {
  public static baseUsertoDTO(user: BaseUserDocument): UserResponse {
    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      imageUrl: user.imageUrl,
      birthday: user.birthDate,
      gender: user.sex,
      languages: user.languages,
      gym: user.gym,
      userType: user.userType,
    }
  }

  public static athleteToDTO(user: AthleteUserDocument): AthleteResponse {
    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      imageUrl: user.imageUrl,
      birthday: user.birthDate,
      gender: user.sex,
      languages: user.languages,
      workoutDays: user.trainingDays,
      gym: user.gym,
      trainingExperience: user.trainingExperience,
      trainingDays: user.trainingDays,
      remaningLike: user.remaningLike,
      canSeePersonalTrainers: user.canSeePersonalTrainers,
      isPremium: user.isPremium,
    }
  }

  public static athletesToDTO(users: AthleteUserDocument[]): AthleteResponse[] {
    return users.map((user) => {
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        imageUrl: user.imageUrl,
        birthday: user.birthDate,
        gender: user.sex,
        languages: user.languages,
        workoutDays: user.trainingDays,
        gym: user.gym,
        trainingExperience: user.trainingExperience,
        trainingDays: user.trainingDays,
        remaningLike: user.remaningLike,
        canSeePersonalTrainers: user.canSeePersonalTrainers,
        isPremium: user.isPremium,
      }
    })
  }

  public static personalTrainerToDTO(
    document: PersonalTrainerDocument,
  ): PTResponse {
    return {
      id: document._id,
      fullName: document.fullName,
      email: document.email,
      imageUrl: document.imageUrl,
      birthday: document.birthDate,
      gender: document.sex,
      languages: document.languages,
      gym: document.gym,
      yearsOfExperience: document.yearsOfExperience,
      certificates: document.certificates,
      iban: document.iban,
    }
  }

  public static personalTrainersToDTO(
    documents: PersonalTrainerDocument[],
  ): PTResponse[] {
    return documents.map((i) => {
      return {
        ...UserMapper.personalTrainerToDTO(i),
      }
    })
  }
}
