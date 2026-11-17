-- Journal d'audit (plan L3). Une ligne par changement de configuration et
-- par décision humaine. La garantie est posée dans la base, pas dans le
-- code applicatif : un déclencheur refuse UPDATE et DELETE, donc une ligne
-- écrite ne peut plus être retouchée ni effacée, quel que soit le chemin.

-- CreateEnum
CREATE TYPE "ActionAudit" AS ENUM ('CREATION', 'MODIFICATION', 'SUPPRESSION', 'DECISION', 'TRANSITION');
CREATE TYPE "ObjetAudit" AS ENUM ('CONSIGNE_AGENT', 'PERSONA', 'LISTE_DIFFUSION', 'GABARIT', 'CONNECTEUR_ITSM', 'APPROBATION', 'ENVOI', 'COMMUNICATION');

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "acteurId" TEXT,
    "acteurCourriel" TEXT NOT NULL,
    "action" "ActionAudit" NOT NULL,
    "objet" "ObjetAudit" NOT NULL,
    "objetId" TEXT NOT NULL,
    "objetLibelle" TEXT NOT NULL,
    "changements" JSONB NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalAudit_organisationId_creeLe_idx" ON "JournalAudit"("organisationId", "creeLe");
CREATE INDEX "JournalAudit_organisationId_objet_objetId_idx" ON "JournalAudit"("organisationId", "objet", "objetId");

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Le journal est en ajout seul. On lève une exception plutôt que d'ignorer
-- l'ordre en silence : un appelant qui croit avoir corrigé une ligne doit
-- échouer bruyamment, sinon il croirait l'audit modifiable.
CREATE OR REPLACE FUNCTION journal_audit_ajout_seul() RETURNS trigger AS $$
BEGIN
  -- Pas de code SQL particulier : Prisma traduit les codes connus en
  -- messages qui désignent le mauvais coupable (une « clé étrangère »).
  RAISE EXCEPTION 'JournalAudit est en ajout seul : % refusé', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Aucune porte de sortie ici : une ligne écrite ne se retouche pas et ne
-- s'efface pas, y compris par SQL direct et y compris pour le propriétaire
-- de la table.
CREATE TRIGGER journal_audit_sans_modification BEFORE UPDATE ON "JournalAudit"
  FOR EACH ROW EXECUTE FUNCTION journal_audit_ajout_seul();

CREATE TRIGGER journal_audit_sans_suppression BEFORE DELETE ON "JournalAudit"
  FOR EACH ROW EXECUTE FUNCTION journal_audit_ajout_seul();

-- TRUNCATE contourne les déclencheurs FOR EACH ROW : il a le sien. Il
-- garde une porte, parce que remettre une base de test à zéro et retirer
-- une organisation de la base sont des gestes légitimes — mais une porte
-- nommée, qu'il faut ouvrir sciemment dans la session. L'application ne
-- peut pas l'ouvrir : le contexte cloisonné lui refuse tout SQL brut.
CREATE OR REPLACE FUNCTION journal_audit_sans_vidage() RETURNS trigger AS $$
BEGIN
  IF current_setting('comgen.maintenance_audit', true) = 'oui' THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'JournalAudit est en ajout seul : TRUNCATE refusé'
    USING HINT = 'SET LOCAL "comgen.maintenance_audit" = ''oui'' pour une remise à zéro assumée';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_audit_sans_vidage BEFORE TRUNCATE ON "JournalAudit"
  FOR EACH STATEMENT EXECUTE FUNCTION journal_audit_sans_vidage();
