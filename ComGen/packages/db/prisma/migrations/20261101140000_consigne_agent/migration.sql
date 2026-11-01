-- Consigne d'agent : le texte envoyé au modèle, par organisation et par
-- rôle. Versionnée : l'identifiant `org/<role>@<version>` est ce qui part
-- dans la trace d'exécution, jamais le texte.

-- CreateTable
CREATE TABLE "ConsigneAgent" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "RoleAgent" NOT NULL,
    "consigne" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "modifieParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsigneAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsigneAgent_organisationId_role_key" ON "ConsigneAgent"("organisationId", "role");
CREATE INDEX "ConsigneAgent_organisationId_idx" ON "ConsigneAgent"("organisationId");

-- AddForeignKey
ALTER TABLE "ConsigneAgent" ADD CONSTRAINT "ConsigneAgent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsigneAgent" ADD CONSTRAINT "ConsigneAgent_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- La version s'incrémente dès que le texte change : une trace renvoie
-- toujours au texte réellement envoyé, y compris si l'écriture passe par
-- un autre chemin que le service.
CREATE OR REPLACE FUNCTION consigne_agent_version() RETURNS trigger AS $$
BEGIN
  IF NEW.consigne IS DISTINCT FROM OLD.consigne THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consigne_agent_version BEFORE UPDATE ON "ConsigneAgent"
  FOR EACH ROW EXECUTE FUNCTION consigne_agent_version();
