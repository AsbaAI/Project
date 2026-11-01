-- Lecture du suggesteur : ce qu'il propose pour le cadrage (titre, nature,
-- criticité) à partir de CETTE source, chaque proposition adossée à un
-- extrait. Écrite à l'insertion avec la source, qui est figée : la lecture
-- porte sur le texte exact qui est conservé.
ALTER TABLE "Source" ADD COLUMN "cadrageSuggere" JSONB;
