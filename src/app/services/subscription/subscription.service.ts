/**
 * @module app.services.subscription
 */

import { DocumentNotFound } from '@app/exceptions/document-not-found-error'
import { StripeError } from '@app/exceptions/stripe-error'
import { SubscriptionMapper } from '@app/mappers/subscription.mapper'
import {
  Subscription,
  SubscriptionModel,
} from '@app/model/subscription/Subscription'
import { SubscriptionResponse } from '@app/types/response.types'
import loggerService from '../logger/logger-service'
import stripeService from '../stripe/stripe.service'
import userService from '../user/user.service'
import subscriptionPackageService from './subscription-package.service'

/**
 * Subscription service
 * @class
 * @alias app.services.subscription.Subscription
 */
class SubscriptionService {
  private subscription: SubscriptionModel

  constructor() {
    this.subscription = Subscription
  }

  /**
   * Subscribes Athletes to a subscription package
   */
  public async subscribe(
    athleteId: string,
    foreginRef: string,
    foreginId: string,
  ): Promise<SubscriptionResponse> {
    await this.checkUserExists(athleteId)
    const foreginSubscription = await this.getForeginSubscription(foreginId)

    const subscriptionPackage = await subscriptionPackageService.getByForeginRef(
      foreginRef,
    )

    const now = new Date()
    const endDate = new Date()
    endDate.setSeconds(
      endDate.getSeconds() + foreginSubscription.current_period_end,
    )

    const subscription = new Subscription({
      foreginId: foreginId,
      user: athleteId,
      package: subscriptionPackage.id,
      status: 'ACTIVE',
      startDate: now,
      endDate: endDate,
    })
    await subscription.save()

    loggerService.info(
      `The Athlete subscribed to a package [userId: ${athleteId}, packageId: ${foreginRef}]`,
    )

    return Promise.resolve(SubscriptionMapper.subscribeToDTO(subscription))
  }

  /**
   * Unsubscribes the Athlete
   */
  public async unsubscribe(
    athleteId: string,
    foreginKey: string,
  ): Promise<SubscriptionResponse> {
    const foreginSubscription = await stripeService.getSubscriptionByAthleteAndProduct(
      athleteId,
      foreginKey,
    )

    const subscriptionPackage = await subscriptionPackageService.getByForeginRef(
      foreginKey,
    )

    const subscription = await Subscription.findOne({
      user: athleteId,
      package: subscriptionPackage.id,
      status: 'ACTIVE',
    })

    if (foreginSubscription)
      await stripeService.unsubscribe(foreginSubscription.id)

    if (subscription) {
      subscription.status = 'INACTIVE'
      await subscription.save()
    }

    loggerService.info(
      'The Athlete unsubscribed a package [athleteId: ${athleteId}, foreginKey: ${foreginKey}]',
    )

    if (!subscription && !foreginSubscription) {
      loggerService.warn(
        `Subscription couldn't found [athleteId: ${athleteId}, foreginKey: ${foreginKey}]`,
      )
      throw new DocumentNotFound('subscription.notFound')
    }

    return Promise.resolve(
      subscription ? SubscriptionMapper.subscribeToDTO(subscription) : null,
    )
  }

  private async checkUserExists(userId: string) {
    const doesUserExist = await userService.existsById(userId)

    if (!doesUserExist) {
      loggerService.warn(
        `User with the given id doesn't exists [userId: ${userId}]`,
      )
      throw new DocumentNotFound('user.notFound')
    }
  }

  private async getForeginSubscription(foreginId: string) {
    const doesForeginIdExists = await stripeService.getSubscriptionById(
      foreginId,
    )

    if (!doesForeginIdExists) {
      loggerService.warn(`Foregin ID doesn't exist [foreginId: ${foreginId}]`)
      throw new StripeError('subscription.notFound')
    }

    return doesForeginIdExists
  }
}

export default new SubscriptionService()
