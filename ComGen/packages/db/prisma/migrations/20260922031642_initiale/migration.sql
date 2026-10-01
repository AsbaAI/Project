-- CreateEnum
CREATE TYPE "Nature" AS ENUM ('SPEC_UPDATE', 'CHANGE', 'INCIDENT', 'RELEASE', 'ORG', 'REGULATORY');

-- CreateEnum
CREATE TYPE "Criticite" AS ENUM ('COURANTE', 'IMPORTANTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "Portee" AS ENUM ('INTERNE', 'INTER_ORG', 'EXTERNE');

-- CreateEnum
CREATE TYPE "ModeEntree" AS ENUM ('FICHIER', 'TEXTE_SAISI', 'CONNECTEUR', 'COURRIEL', 'DICTEE', 'API', 'FORMULAIRE');

-- CreateEnum
CREATE TYPE "TypeSource" AS ENUM ('FICHIER', 'TEXTE_SAISI', 'CONNECTEUR', 'COURRIEL', 'DICTEE', 'API', 'FORMULAIRE');

-- CreateEnum
CREATE TYPE "IntentionReprise" AS ENUM ('MISE_A_JOUR', 'CORRECTIF', 'RAPPEL');

-- CreateEnum
CREATE TYPE "Niveau" AS ENUM ('PUBLIC', 'INTERNE', 'RESTREINT', 'SECRET');

-- CreateEnum
CREATE TYPE "TypeValeur" AS ENUM ('DATE', 'NOMBRE', 'VERSION', 'IDENTIFIANT', 'NOM', 'TEXTE');

-- CreateEnum
CREATE TYPE "StatutFait" AS ENUM ('PROPOSE', 'CONFIRME', 'RETIRE', 'PERIME', 'DECLARE');

-- CreateEnum
CREATE TYPE "FormatTemplate" AS ENUM ('MAIL_HTML', 'MAIL_TEXTE', 'PDF', 'NEWSLETTER', 'MESSAGE_INSTANTANE', 'ARTICLE', 'UNE_PAGE');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('COURRIEL', 'MESSAGERIE_INSTANTANEE', 'PORTAIL', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "EtatCommunication" AS ENUM ('BROUILLON', 'FAITS_A_VALIDER', 'PRETE_A_GENERER', 'EN_GENERATION', 'EN_CONTROLE', 'A_CORRIGER', 'EN_RELECTURE', 'EN_APPROBATION', 'APPROUVEE', 'ENVOI_PLANIFIE', 'ENVOYEE', 'REJETEE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "EtatVariante" AS ENUM ('EN_GENERATION', 'A_REVOIR', 'BLOQUEE', 'CONFORME', 'APPROUVEE', 'ENVOYEE', 'ECHEC');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('SOUTENUE', 'CONTREDITE', 'SANS_APPUI', 'NON_FACTUELLE');

-- CreateEnum
CREATE TYPE "TypeControle" AS ENUM ('ANCRAGE', 'COMPARAISON_EXACTE', 'TOXICITE', 'DONNEES_SENSIBLES', 'CONFIDENTIALITE_PERSONA', 'TEMPLATE', 'LISTE', 'TON', 'LISIBILITE', 'LONGUEUR', 'COHERENCE_INTER_VARIANTES');

-- CreateEnum
CREATE TYPE "Gravite" AS ENUM ('INFO', 'AVERTISSEMENT', 'ERREUR');

-- CreateEnum
CREATE TYPE "OrigineTexte" AS ENUM ('GENEREE', 'EDITEE', 'REIMPORTEE', 'CORRIGEE_AGENT');

-- CreateEnum
CREATE TYPE "TypeEntite" AS ENUM ('PROJET', 'PRODUIT', 'SYSTEME', 'CLIENT', 'SITE', 'NORME', 'MOT_CLE');

-- CreateEnum
CREATE TYPE "RoleMention" AS ENUM ('PRINCIPAL', 'INCIDENT');

-- CreateEnum
CREATE TYPE "OrigineSuggestion" AS ENUM ('ENTITE', 'MOT_CLE', 'DIMENSION');

-- CreateEnum
CREATE TYPE "DecisionSuggestion" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'REPORTEE');

-- CreateEnum
CREATE TYPE "TypeListe" AS ENUM ('STATIQUE', 'GROUPE_ANNUAIRE', 'REGLE', 'IMPORT');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('RELECTURE', 'APPROBATION');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'DELEGUEE');

-- CreateEnum
CREATE TYPE "RoleAgent" AS ENUM ('EXTRACTEUR', 'ANALYSTE_IMPACT', 'REDACTEUR', 'VERIFICATEUR', 'GARDIEN', 'CORRECTEUR', 'ARBITRE', 'SUGGESTEUR');

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('REDACTEUR', 'RELECTEUR', 'APPROBATEUR', 'ADMINISTRATEUR', 'AUDITEUR');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codePays" TEXT NOT NULL,
    "fuseauHoraire" TEXT NOT NULL,
    "localeDefaut" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "localesAutorisees" TEXT[],
    "residenceDonnees" TEXT NOT NULL,
    "modelesAutorises" TEXT[],

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fuseauHoraire" TEXT NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "siteId" TEXT,
    "courriel" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sujetOidc" TEXT,
    "roles" "RoleUtilisateur"[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "nature" "Nature" NOT NULL,
    "criticite" "Criticite" NOT NULL,
    "portee" "Portee" NOT NULL,
    "langue" TEXT NOT NULL,
    "dateEffet" TIMESTAMP(3),
    "echeance" TIMESTAMP(3),
    "etat" "EtatCommunication" NOT NULL DEFAULT 'BROUILLON',
    "modeEntree" "ModeEntree" NOT NULL,
    "auteurId" TEXT NOT NULL,
    "parentId" TEXT,
    "intentionReprise" "IntentionReprise",
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "type" "TypeSource" NOT NULL,
    "nom" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "cheminStockage" TEXT,
    "contenuTexte" TEXT,
    "langue" TEXT,
    "confidentialite" "Niveau" NOT NULL,
    "figeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fait" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "enonce" TEXT NOT NULL,
    "valeur" TEXT,
    "typeValeur" "TypeValeur",
    "citation" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "localisation" JSONB NOT NULL,
    "confiance" DOUBLE PRECISION NOT NULL,
    "confidentialite" "Niveau" NOT NULL,
    "statut" "StatutFait" NOT NULL DEFAULT 'PROPOSE',

    CONSTRAINT "Fait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmendementFait" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "faitId" TEXT NOT NULL,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "sourceInvoquee" TEXT,
    "responsabiliteAssumee" BOOLEAN NOT NULL,
    "auteurId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmendementFait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "voix" JSONB NOT NULL,
    "lexique" JSONB NOT NULL,
    "gardeFous" JSONB NOT NULL,
    "exemples" TEXT[],
    "canalDefaut" "Canal" NOT NULL,
    "approbateurIds" TEXT[],

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "format" "FormatTemplate" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "corps" TEXT NOT NULL,
    "emplacements" JSONB NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canevas" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "nature" "Nature" NOT NULL,
    "nom" TEXT NOT NULL,
    "emplacements" JSONB NOT NULL,

    CONSTRAINT "Canevas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variante" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "contenu" JSONB NOT NULL,
    "etat" "EtatVariante" NOT NULL DEFAULT 'EN_GENERATION',
    "score" DOUBLE PRECISION,
    "longueurMots" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affirmation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "faitIds" TEXT[],
    "explication" TEXT,

    CONSTRAINT "Affirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Controle" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "type" "TypeControle" NOT NULL,
    "bloquant" BOOLEAN NOT NULL,
    "gravite" "Gravite" NOT NULL,
    "message" TEXT NOT NULL,
    "localisation" JSONB,
    "resoluLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Controle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionTexte" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "origine" "OrigineTexte" NOT NULL,
    "auteurId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionTexte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entite" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "type" "TypeEntite" NOT NULL,
    "libelle" TEXT NOT NULL,
    "alias" TEXT[],
    "codeInterne" TEXT,
    "responsableId" TEXT,
    "listeIds" TEXT[],
    "personaIds" TEXT[],
    "confidentialite" "Niveau" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Entite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "varianteId" TEXT,
    "sourceId" TEXT,
    "terme" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "role" "RoleMention" NOT NULL,
    "confiance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionAudience" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "origine" "OrigineSuggestion" NOT NULL,
    "entiteId" TEXT,
    "dimension" TEXT,
    "listeId" TEXT,
    "personneId" TEXT,
    "justification" TEXT NOT NULL,
    "extrait" TEXT NOT NULL,
    "pertinence" DOUBLE PRECISION NOT NULL,
    "decision" "DecisionSuggestion" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeDiffusion" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "siteId" TEXT,
    "nom" TEXT NOT NULL,
    "type" "TypeListe" NOT NULL,
    "definition" JSONB NOT NULL,
    "exclusions" TEXT[],
    "personaId" TEXT,

    CONSTRAINT "ListeDiffusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approbation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "varianteId" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "regime" "Regime" NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,
    "ancrage" JSONB,
    "decideLe" TIMESTAMP(3),
    "annuleeLe" TIMESTAMP(3),
    "motifAnnulation" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approbation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envoi" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "destinataires" JSONB NOT NULL,
    "planifiePour" TIMESTAMP(3),
    "envoyeLe" TIMESTAMP(3),
    "etatRemise" JSONB NOT NULL,
    "annulable" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Envoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "varianteId" TEXT,
    "communicationId" TEXT NOT NULL,
    "agent" "RoleAgent" NOT NULL,
    "modele" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "parametres" JSONB NOT NULL,
    "jetonsEntree" INTEGER NOT NULL,
    "jetonsSortie" INTEGER NOT NULL,
    "dureeMs" INTEGER NOT NULL,
    "coutCentimes" INTEGER NOT NULL,
    "succes" BOOLEAN NOT NULL,
    "erreur" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurReference" (
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurReference_pkey" PRIMARY KEY ("annee")
);

-- CreateIndex
CREATE INDEX "Region_organisationId_idx" ON "Region"("organisationId");

-- CreateIndex
CREATE INDEX "Site_organisationId_idx" ON "Site"("organisationId");

-- CreateIndex
CREATE INDEX "Site_regionId_idx" ON "Site"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_courriel_key" ON "Utilisateur"("courriel");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_sujetOidc_key" ON "Utilisateur"("sujetOidc");

-- CreateIndex
CREATE INDEX "Utilisateur_organisationId_idx" ON "Utilisateur"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Communication_reference_key" ON "Communication"("reference");

-- CreateIndex
CREATE INDEX "Communication_organisationId_etat_idx" ON "Communication"("organisationId", "etat");

-- CreateIndex
CREATE INDEX "Communication_organisationId_auteurId_idx" ON "Communication"("organisationId", "auteurId");

-- CreateIndex
CREATE INDEX "Source_organisationId_idx" ON "Source"("organisationId");

-- CreateIndex
CREATE INDEX "Source_communicationId_idx" ON "Source"("communicationId");

-- CreateIndex
CREATE INDEX "Fait_organisationId_idx" ON "Fait"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Fait_communicationId_reference_key" ON "Fait"("communicationId", "reference");

-- CreateIndex
CREATE INDEX "AmendementFait_organisationId_idx" ON "AmendementFait"("organisationId");

-- CreateIndex
CREATE INDEX "AmendementFait_faitId_idx" ON "AmendementFait"("faitId");

-- CreateIndex
CREATE INDEX "Persona_organisationId_idx" ON "Persona"("organisationId");

-- CreateIndex
CREATE INDEX "Template_organisationId_idx" ON "Template"("organisationId");

-- CreateIndex
CREATE INDEX "Canevas_organisationId_idx" ON "Canevas"("organisationId");

-- CreateIndex
CREATE INDEX "Variante_organisationId_idx" ON "Variante"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Variante_communicationId_personaId_key" ON "Variante"("communicationId", "personaId");

-- CreateIndex
CREATE INDEX "Affirmation_organisationId_idx" ON "Affirmation"("organisationId");

-- CreateIndex
CREATE INDEX "Affirmation_varianteId_idx" ON "Affirmation"("varianteId");

-- CreateIndex
CREATE INDEX "Controle_organisationId_idx" ON "Controle"("organisationId");

-- CreateIndex
CREATE INDEX "Controle_varianteId_resoluLe_idx" ON "Controle"("varianteId", "resoluLe");

-- CreateIndex
CREATE INDEX "VersionTexte_organisationId_idx" ON "VersionTexte"("organisationId");

-- CreateIndex
CREATE INDEX "VersionTexte_varianteId_creeLe_idx" ON "VersionTexte"("varianteId", "creeLe");

-- CreateIndex
CREATE INDEX "Entite_organisationId_actif_idx" ON "Entite"("organisationId", "actif");

-- CreateIndex
CREATE INDEX "Mention_organisationId_idx" ON "Mention"("organisationId");

-- CreateIndex
CREATE INDEX "Mention_entiteId_idx" ON "Mention"("entiteId");

-- CreateIndex
CREATE INDEX "SuggestionAudience_organisationId_idx" ON "SuggestionAudience"("organisationId");

-- CreateIndex
CREATE INDEX "SuggestionAudience_communicationId_decision_idx" ON "SuggestionAudience"("communicationId", "decision");

-- CreateIndex
CREATE INDEX "ListeDiffusion_organisationId_idx" ON "ListeDiffusion"("organisationId");

-- CreateIndex
CREATE INDEX "Approbation_organisationId_idx" ON "Approbation"("organisationId");

-- CreateIndex
CREATE INDEX "Approbation_communicationId_decision_annuleeLe_idx" ON "Approbation"("communicationId", "decision", "annuleeLe");

-- CreateIndex
CREATE INDEX "Envoi_organisationId_idx" ON "Envoi"("organisationId");

-- CreateIndex
CREATE INDEX "Envoi_varianteId_idx" ON "Envoi"("varianteId");

-- CreateIndex
CREATE INDEX "Execution_organisationId_idx" ON "Execution"("organisationId");

-- CreateIndex
CREATE INDEX "Execution_communicationId_agent_idx" ON "Execution"("communicationId", "agent");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Communication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fait" ADD CONSTRAINT "Fait_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fait" ADD CONSTRAINT "Fait_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmendementFait" ADD CONSTRAINT "AmendementFait_faitId_fkey" FOREIGN KEY ("faitId") REFERENCES "Fait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmendementFait" ADD CONSTRAINT "AmendementFait_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canevas" ADD CONSTRAINT "Canevas_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canevas" ADD CONSTRAINT "Canevas_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affirmation" ADD CONSTRAINT "Affirmation_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Controle" ADD CONSTRAINT "Controle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionTexte" ADD CONSTRAINT "VersionTexte_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionTexte" ADD CONSTRAINT "VersionTexte_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entite" ADD CONSTRAINT "Entite_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entite" ADD CONSTRAINT "Entite_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionAudience" ADD CONSTRAINT "SuggestionAudience_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionAudience" ADD CONSTRAINT "SuggestionAudience_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeDiffusion" ADD CONSTRAINT "ListeDiffusion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeDiffusion" ADD CONSTRAINT "ListeDiffusion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeDiffusion" ADD CONSTRAINT "ListeDiffusion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeDiffusion" ADD CONSTRAINT "ListeDiffusion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approbation" ADD CONSTRAINT "Approbation_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approbation" ADD CONSTRAINT "Approbation_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approbation" ADD CONSTRAINT "Approbation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envoi" ADD CONSTRAINT "Envoi_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Déclencheurs ComGen — écrits à la main, complètent le schéma généré.
--
-- 1. Cohérence d'organisation : une ligne fille porte la même
--    "organisationId" que son parent, sinon l'insertion échoue. Le
--    cloisonnement ne repose donc pas seulement sur le contexte d'accès.
-- 2. Contrainte cardinale (§7) : toute écriture de "Variante".contenu remet
--    la variante à revoir, annule ses approbations et ramène la
--    communication en EN_CONTROLE — même par SQL direct.
-- 3. Un amendement de fait (§11) annule les approbations des variantes dont
--    une affirmation référence le fait.
-- ===========================================================================

CREATE FUNCTION comgen_verifier_organisation_parent() RETURNS trigger AS $$
DECLARE
  table_parent text := TG_ARGV[0];
  colonne_fk   text := TG_ARGV[1];
  valeur_fk    text;
  org_parent   text;
BEGIN
  valeur_fk := to_jsonb(NEW) ->> colonne_fk;
  IF valeur_fk IS NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT "organisationId" FROM %I WHERE id = $1', table_parent)
    INTO org_parent USING valeur_fk;
  IF org_parent IS NULL THEN
    RAISE EXCEPTION 'COMGEN_PARENT_INTROUVABLE: %.% = % introuvable', TG_TABLE_NAME, colonne_fk, valeur_fk
      USING ERRCODE = '23503';
  END IF;
  IF NEW."organisationId" IS DISTINCT FROM org_parent THEN
    RAISE EXCEPTION 'COMGEN_ORGANISATION_INCOHERENTE: %.% désigne une ligne de l''organisation %, la ligne déclare %',
      TG_TABLE_NAME, colonne_fk, org_parent, NEW."organisationId"
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Un déclencheur par clé étrangère vers une table cloisonnée.
CREATE TRIGGER site_org_region BEFORE INSERT OR UPDATE ON "Site"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER utilisateur_org_region BEFORE INSERT OR UPDATE ON "Utilisateur"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER utilisateur_org_site BEFORE INSERT OR UPDATE ON "Utilisateur"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Site', 'siteId');
CREATE TRIGGER communication_org_region BEFORE INSERT OR UPDATE ON "Communication"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER communication_org_auteur BEFORE INSERT OR UPDATE ON "Communication"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Utilisateur', 'auteurId');
CREATE TRIGGER communication_org_parent BEFORE INSERT OR UPDATE ON "Communication"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'parentId');
CREATE TRIGGER source_org_communication BEFORE INSERT OR UPDATE ON "Source"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER fait_org_communication BEFORE INSERT OR UPDATE ON "Fait"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER fait_org_source BEFORE INSERT OR UPDATE ON "Fait"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Source', 'sourceId');
CREATE TRIGGER amendement_org_fait BEFORE INSERT OR UPDATE ON "AmendementFait"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Fait', 'faitId');
CREATE TRIGGER amendement_org_auteur BEFORE INSERT OR UPDATE ON "AmendementFait"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Utilisateur', 'auteurId');
CREATE TRIGGER persona_org_region BEFORE INSERT OR UPDATE ON "Persona"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER template_org_region BEFORE INSERT OR UPDATE ON "Template"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER canevas_org_region BEFORE INSERT OR UPDATE ON "Canevas"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER variante_org_communication BEFORE INSERT OR UPDATE ON "Variante"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER variante_org_persona BEFORE INSERT OR UPDATE ON "Variante"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Persona', 'personaId');
CREATE TRIGGER variante_org_template BEFORE INSERT OR UPDATE ON "Variante"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Template', 'templateId');
CREATE TRIGGER affirmation_org_variante BEFORE INSERT OR UPDATE ON "Affirmation"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER controle_org_variante BEFORE INSERT OR UPDATE ON "Controle"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER version_org_variante BEFORE INSERT OR UPDATE ON "VersionTexte"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER version_org_auteur BEFORE INSERT OR UPDATE ON "VersionTexte"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Utilisateur', 'auteurId');
CREATE TRIGGER entite_org_region BEFORE INSERT OR UPDATE ON "Entite"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER mention_org_entite BEFORE INSERT OR UPDATE ON "Mention"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Entite', 'entiteId');
CREATE TRIGGER mention_org_variante BEFORE INSERT OR UPDATE ON "Mention"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER mention_org_source BEFORE INSERT OR UPDATE ON "Mention"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Source', 'sourceId');
CREATE TRIGGER suggestion_org_communication BEFORE INSERT OR UPDATE ON "SuggestionAudience"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER suggestion_org_entite BEFORE INSERT OR UPDATE ON "SuggestionAudience"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Entite', 'entiteId');
CREATE TRIGGER liste_org_region BEFORE INSERT OR UPDATE ON "ListeDiffusion"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Region', 'regionId');
CREATE TRIGGER liste_org_site BEFORE INSERT OR UPDATE ON "ListeDiffusion"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Site', 'siteId');
CREATE TRIGGER liste_org_persona BEFORE INSERT OR UPDATE ON "ListeDiffusion"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Persona', 'personaId');
CREATE TRIGGER approbation_org_communication BEFORE INSERT OR UPDATE ON "Approbation"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER approbation_org_variante BEFORE INSERT OR UPDATE ON "Approbation"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER approbation_org_utilisateur BEFORE INSERT OR UPDATE ON "Approbation"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Utilisateur', 'utilisateurId');
CREATE TRIGGER envoi_org_variante BEFORE INSERT OR UPDATE ON "Envoi"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');
CREATE TRIGGER execution_org_communication BEFORE INSERT OR UPDATE ON "Execution"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Communication', 'communicationId');
CREATE TRIGGER execution_org_variante BEFORE INSERT OR UPDATE ON "Execution"
  FOR EACH ROW EXECUTE FUNCTION comgen_verifier_organisation_parent('Variante', 'varianteId');

-- ---------------------------------------------------------------------------
-- Contrainte cardinale : écriture de "Variante".contenu (§7, §17).
-- ---------------------------------------------------------------------------

CREATE FUNCTION comgen_variante_avant_ecriture_contenu() RETURNS trigger AS $$
BEGIN
  IF NEW.contenu IS DISTINCT FROM OLD.contenu THEN
    IF OLD.etat = 'ENVOYEE' THEN
      RAISE EXCEPTION 'COMGEN_CONTENU_FIGE: la variante % a été envoyée, son contenu ne se modifie plus', OLD.id
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "Communication" c
      WHERE c.id = NEW."communicationId" AND c.etat IN ('ENVOI_PLANIFIE', 'ENVOYEE', 'ARCHIVEE')
    ) THEN
      RAISE EXCEPTION 'COMGEN_CONTENU_FIGE: la communication de la variante % est planifiée, envoyée ou archivée', OLD.id
        USING ERRCODE = '23514';
    END IF;
    -- Quel que soit l'état demandé par l'appelant, le contenu modifié est à revoir.
    NEW.etat := 'A_REVOIR';
    NEW.score := NULL;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER variante_avant_ecriture_contenu BEFORE UPDATE OF contenu ON "Variante"
  FOR EACH ROW EXECUTE FUNCTION comgen_variante_avant_ecriture_contenu();

CREATE FUNCTION comgen_variante_apres_ecriture_contenu() RETURNS trigger AS $$
BEGIN
  IF NEW.contenu IS DISTINCT FROM OLD.contenu THEN
    UPDATE "Approbation"
      SET "annuleeLe" = now(), "motifAnnulation" = 'CONTENU_MODIFIE'
      WHERE "annuleeLe" IS NULL
        AND ("varianteId" = NEW.id OR ("varianteId" IS NULL AND "communicationId" = NEW."communicationId"));
    UPDATE "Communication"
      SET etat = 'EN_CONTROLE'
      WHERE id = NEW."communicationId"
        AND etat IN ('A_CORRIGER', 'EN_RELECTURE', 'EN_APPROBATION', 'APPROUVEE');
  END IF;
  RETURN NULL;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER variante_apres_ecriture_contenu AFTER UPDATE OF contenu ON "Variante"
  FOR EACH ROW EXECUTE FUNCTION comgen_variante_apres_ecriture_contenu();

-- ---------------------------------------------------------------------------
-- Amendement d'un fait (§11) : les variantes qui s'appuient sur le fait
-- perdent leurs approbations et repassent à revoir. Une variante déjà
-- envoyée est de l'histoire : elle n'est pas touchée (un correctif est une
-- nouvelle communication, §10).
-- ---------------------------------------------------------------------------

CREATE FUNCTION comgen_amendement_apres_insertion() RETURNS trigger AS $$
DECLARE
  variantes_touchees      text[];
  communications_touchees text[];
BEGIN
  SELECT array_agg(DISTINCT v.id) INTO variantes_touchees
    FROM "Affirmation" a
    JOIN "Variante" v ON v.id = a."varianteId"
    WHERE NEW."faitId" = ANY (a."faitIds") AND v.etat <> 'ENVOYEE';
  IF variantes_touchees IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT array_agg(DISTINCT v."communicationId") INTO communications_touchees
    FROM "Variante" v WHERE v.id = ANY (variantes_touchees);
  UPDATE "Approbation"
    SET "annuleeLe" = now(), "motifAnnulation" = 'FAIT_AMENDE'
    WHERE "annuleeLe" IS NULL
      AND ("varianteId" = ANY (variantes_touchees)
           OR ("varianteId" IS NULL AND "communicationId" = ANY (communications_touchees)));
  UPDATE "Variante" SET etat = 'A_REVOIR', score = NULL WHERE id = ANY (variantes_touchees);
  UPDATE "Communication"
    SET etat = 'EN_CONTROLE'
    WHERE id = ANY (communications_touchees)
      AND etat IN ('A_CORRIGER', 'EN_RELECTURE', 'EN_APPROBATION', 'APPROUVEE');
  RETURN NULL;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER amendement_apres_insertion AFTER INSERT ON "AmendementFait"
  FOR EACH ROW EXECUTE FUNCTION comgen_amendement_apres_insertion();
