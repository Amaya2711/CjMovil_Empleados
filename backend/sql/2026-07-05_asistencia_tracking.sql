  /*
    ROLLBACK MARKER: ROLLBACK_ASISTENCIA_BG_TRACKING_V1
    Para rollback funcional:
    1. Cambiar ENABLE_BACKGROUND_LOCATION_TRACKING = false en mobile-app-fresh/src/features/asistenciaTracking/config.js
    2. Cambiar ENABLE_ASISTENCIA_TRACKING_V1 = false en backend/src/config/featureFlags.js
    3. Recompilar app y reiniciar backend
  */

  IF OBJECT_ID('dbo.AsistenciaTrackingSesion', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.AsistenciaTrackingSesion (
      SesionId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      CodEmp VARCHAR(50) NOT NULL,
      UsuarioAct INT NULL,
      FechaAsistencia DATE NOT NULL,
      Plataforma VARCHAR(20) NULL,
      FechaHoraIngreso DATETIME2(0) NOT NULL CONSTRAINT DF_AsistenciaTrackingSesion_FechaHoraIngreso DEFAULT SYSDATETIME(),
      FechaHoraSalida DATETIME2(0) NULL,
      LatitudIngreso DECIMAL(18, 6) NULL,
      LongitudIngreso DECIMAL(18, 6) NULL,
      AccuracyIngreso DECIMAL(18, 6) NULL,
      LatitudSalida DECIMAL(18, 6) NULL,
      LongitudSalida DECIMAL(18, 6) NULL,
      AccuracySalida DECIMAL(18, 6) NULL,
      Estado VARCHAR(20) NOT NULL CONSTRAINT DF_AsistenciaTrackingSesion_Estado DEFAULT 'ACTIVO',
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AsistenciaTrackingSesion_CreatedAt DEFAULT SYSDATETIME(),
      UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AsistenciaTrackingSesion_UpdatedAt DEFAULT SYSDATETIME()
    );
  END;
  GO

  IF OBJECT_ID('dbo.AsistenciaTrackingPunto', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.AsistenciaTrackingPunto (
      PuntoId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      SesionId BIGINT NOT NULL,
      FechaHora DATETIME2(0) NOT NULL,
      Latitud DECIMAL(18, 6) NOT NULL,
      Longitud DECIMAL(18, 6) NOT NULL,
      Accuracy DECIMAL(18, 6) NULL,
      Speed DECIMAL(18, 6) NULL,
      Heading DECIMAL(18, 6) NULL,
      Source VARCHAR(50) NOT NULL CONSTRAINT DF_AsistenciaTrackingPunto_Source DEFAULT 'background-task',
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AsistenciaTrackingPunto_CreatedAt DEFAULT SYSDATETIME(),
      CONSTRAINT FK_AsistenciaTrackingPunto_Sesion
        FOREIGN KEY (SesionId) REFERENCES dbo.AsistenciaTrackingSesion(SesionId)
    );
  END;
  GO

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_AsistenciaTrackingSesion_CodEmp_Fecha_Estado'
      AND object_id = OBJECT_ID('dbo.AsistenciaTrackingSesion')
  )
  BEGIN
    CREATE INDEX IX_AsistenciaTrackingSesion_CodEmp_Fecha_Estado
      ON dbo.AsistenciaTrackingSesion (CodEmp, FechaAsistencia, Estado);
  END;
  GO

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_AsistenciaTrackingPunto_SesionId_FechaHora'
      AND object_id = OBJECT_ID('dbo.AsistenciaTrackingPunto')
  )
  BEGIN
    CREATE INDEX IX_AsistenciaTrackingPunto_SesionId_FechaHora
      ON dbo.AsistenciaTrackingPunto (SesionId, FechaHora);
  END;
  GO

  /*
    Rollback SQL manual, solo si deciden eliminar la estructura:

    DROP TABLE dbo.AsistenciaTrackingPunto;
    DROP TABLE dbo.AsistenciaTrackingSesion;
  */
