-- Connecteur ITSM : configuration par organisation, et origine d'une source
-- venue d'un ticket.

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "origineExterne" JSONB;

-- CreateTable
CREATE TABLE "ConnecteurItsm" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "systeme" TEXT NOT NULL,
    "urlInstance" TEXT NOT NULL,
    "methodeAuth" TEXT NOT NULL,
    "identifiantPublic" TEXT NOT NULL,
    "refSecret" TEXT NOT NULL,
    "masquage" JSONB NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "testeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnecteurItsm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnecteurItsm_organisationId_key" ON "ConnecteurItsm"("organisationId");

-- AddForeignKey
ALTER TABLE "ConnecteurItsm" ADD CONSTRAINT "ConnecteurItsm_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes que Prisma ne sait pas exprimer. La base les tient même si un
-- chemin de code les oubliait.
--
-- `refSecret` est le NOM d'une variable d'environnement dédiée au connecteur.
-- Sans ce préfixe obligatoire, une configuration pourrait désigner
-- `AUTH_SECRET` ou `DATABASE_URL` et les envoyer à l'instance configurée
-- (spécification §19 : aucun secret en base, et aucun accès à ceux des autres).
ALTER TABLE "ConnecteurItsm"
  ADD CONSTRAINT "ConnecteurItsm_systeme_check" CHECK ("systeme" IN ('servicenow')),
  ADD CONSTRAINT "ConnecteurItsm_methodeAuth_check" CHECK ("methodeAuth" IN ('oauth2', 'basic')),
  ADD CONSTRAINT "ConnecteurItsm_refSecret_check" CHECK ("refSecret" ~ '^ITSM_[A-Z0-9_]{1,60}$');
