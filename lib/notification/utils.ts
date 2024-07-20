import type { Language } from '../types'
import type { Knex } from 'knex'

import lodash from 'lodash'

const { mergeWith, uniq } = lodash

const mergeDataCustomizer = (objValue: any, srcValue: any) => {
  if (Array.isArray(objValue)) {
    return uniq(objValue.concat(srcValue))
  }
}

export const mergeDataWith = (objValue: any, srcValue: any) =>
  mergeWith(objValue, srcValue, mergeDataCustomizer)

export const loadLatestArticleVersion = async (articleId: string, knex: Knex) =>
  knex('article_version_newest').where('articleId', articleId).first()

type TranslationFn<V> = (vars: V) => string
interface Translations<V> {
  zh_hant: string | TranslationFn<V>
  zh_hans?: string | TranslationFn<V>
  en?: string | TranslationFn<V>
}
type TransFn<V> = (lang: Language, vars: V) => string

/**
 *
 * Usage:
 *
 * ```
 *  const t = i18n<{ index: number }>({
 *    zh_hant: ({ index }) => `項 ${index}`,
 *    zh_hans: ({ index }) => `项 ${index}`,
 *    en: ({ index }) => `Item ${index}`
 *  })
 *
 *  t('en', { index: 1 }) // "Item 1"
 * ```
 *
 */
export const i18n =
  <V>(translations: Translations<V>): TransFn<V> =>
  (lang, vars) => {
    // fallback to `zh_hant`
    const trans = translations[lang] || translations.zh_hant

    if (typeof trans === 'string') {
      return trans
    }

    return trans(vars)
  }
