/**
 * Registre des fournisseurs et gardes d'affectation (spécification §5.4).
 *
 * Le registre ne décide rien du métier : il vérifie ce que la spécification
 * exige d'un fournisseur avant qu'un rôle d'agent puisse s'appuyer dessus,
 * et il explique chaque refus.
 */

import type { ResultatIndependance, RoleAgent } from '@comgen/core'
import { verifierIndependanceFamilles } from '@comgen/core'

import type { FournisseurModele } from './types.ts'
import { ErreurFournisseur } from './types.ts'

export type CodeRefusAffectation = 'SORTIE_STRUCTUREE_AUCUNE' | 'SORTIE_STRUCTUREE_INSUFFISANTE'

export type ResultatAffectation =
  { affectable: true } | { affectable: false; code: CodeRefusAffectation; motif: string }

/** Rôles pour lesquels §5.4 exige une sortie structurée `native` ou `par_prompt`. */
const ROLES_EXIGEANT_STRUCTURE: ReadonlySet<RoleAgent> = new Set<RoleAgent>([
  'EXTRACTEUR',
  'VERIFICATEUR',
])

/** Base d'affinage des deux modèles, quand ils en ont une (`ModeleEnregistre.baseAffinage`). */
export interface AffinagesControles {
  redacteur?: string | undefined
  verificateur?: string | undefined
}

export class RegistreFournisseurs {
  private readonly fournisseurs = new Map<string, FournisseurModele>()

  enregistrer(fournisseur: FournisseurModele): void {
    if (this.fournisseurs.has(fournisseur.id)) {
      throw new ErreurFournisseur(
        'CONFIG',
        `Un fournisseur « ${fournisseur.id} » est déjà enregistré.`,
        { fournisseurId: fournisseur.id },
      )
    }
    this.fournisseurs.set(fournisseur.id, fournisseur)
  }

  obtenir(id: string): FournisseurModele {
    const fournisseur = this.fournisseurs.get(id)
    if (fournisseur === undefined) {
      throw new ErreurFournisseur('CONFIG', `Fournisseur « ${id} » inconnu du registre.`, {
        fournisseurId: id,
      })
    }
    return fournisseur
  }

  lister(): FournisseurModele[] {
    return [...this.fournisseurs.values()]
  }

  /**
   * §5.1 : `aucune` interdit tout rôle d'agent, car toute sortie est validée
   * par un schéma Zod. §5.4 : EXTRACTEUR et VERIFICATEUR exigent `native`
   * ou `par_prompt`. Le taux de validation mesuré au banc (> 98 %) relève de
   * la qualification (§5.5), pas du registre.
   */
  verifierAffectable(fournisseur: FournisseurModele, role: RoleAgent): ResultatAffectation {
    const { sortieStructuree } = fournisseur.capacites()
    if (sortieStructuree === 'aucune') {
      return {
        affectable: false,
        code: 'SORTIE_STRUCTUREE_AUCUNE',
        motif: `Le fournisseur « ${fournisseur.id} » ne garantit aucune sortie structurée ; aucun rôle d'agent (ici ${role}) ne peut lui être affecté, car chaque sortie doit valider un schéma.`,
      }
    }
    if (
      ROLES_EXIGEANT_STRUCTURE.has(role) &&
      sortieStructuree !== 'native' &&
      sortieStructuree !== 'par_prompt'
    ) {
      return {
        affectable: false,
        code: 'SORTIE_STRUCTUREE_INSUFFISANTE',
        motif: `Le rôle ${role} exige une sortie structurée native ou par consigne ; le fournisseur « ${fournisseur.id} » déclare « ${String(sortieStructuree)} ».`,
      }
    }
    return { affectable: true }
  }

  /**
   * Indépendance REDACTEUR / VERIFICATEUR (§5.4, §8), déléguée à la fonction
   * pure de `@comgen/core`. La famille vient des capacités déclarées ; la
   * base d'affinage, absente de `Capacites`, est fournie par l'appelant.
   */
  verifierIndependance(
    redacteur: FournisseurModele,
    verificateur: FournisseurModele,
    affinages: AffinagesControles = {},
  ): ResultatIndependance {
    return verifierIndependanceFamilles({
      REDACTEUR: {
        famille: redacteur.capacites().famille,
        identifiantModele: redacteur.id,
        baseAffinage: affinages.redacteur,
      },
      VERIFICATEUR: {
        famille: verificateur.capacites().famille,
        identifiantModele: verificateur.id,
        baseAffinage: affinages.verificateur,
      },
    })
  }
}
