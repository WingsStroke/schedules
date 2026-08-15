function validationError(path, message) {
  return new Error(`Esquema inválido en ${path}: ${message}`);
}

export function validateIndexSchema(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return validationError('índice', 'debe ser un objeto');
  if (!Array.isArray(data.semestres)) return validationError('semestres', 'debe ser un array');

  for (const [semesterIndex, semester] of data.semestres.entries()) {
    if (!semester || typeof semester !== 'object') return validationError(`semestres[${semesterIndex}]`, 'debe ser un objeto');
    if (typeof semester.periodo !== 'string' || semester.periodo.trim() === '') {
      return validationError(`semestres[${semesterIndex}].periodo`, 'debe ser texto no vacío');
    }
    if (!Array.isArray(semester.programas)) {
      return validationError(`semestres[${semesterIndex}].programas`, 'debe ser un array');
    }

    for (const [programIndex, program] of semester.programas.entries()) {
      if (!program || typeof program !== 'object') return validationError(`semestres[${semesterIndex}].programas[${programIndex}]`, 'debe ser un objeto');
      for (const field of ['id', 'nombre', 'archivo']) {
        if (typeof program[field] !== 'string' || program[field].trim() === '') {
          return validationError(`semestres[${semesterIndex}].programas[${programIndex}].${field}`, 'debe ser texto no vacío');
        }
      }
      if (program.activo !== undefined && typeof program.activo !== 'boolean') {
        return validationError(`semestres[${semesterIndex}].programas[${programIndex}].activo`, 'debe ser booleano');
      }
    }
  }

  return true;
}

export function validateProgramSchema(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return validationError('oferta', 'debe ser un objeto');
  if (data.metadata !== undefined && (!data.metadata || typeof data.metadata !== 'object' || Array.isArray(data.metadata))) {
    return validationError('metadata', 'debe ser un objeto');
  }
  if (!Array.isArray(data.semestres)) return validationError('semestres', 'debe ser un array');

  for (const [semesterIndex, semester] of data.semestres.entries()) {
    if (!semester || typeof semester !== 'object' || !Array.isArray(semester.asignaturas)) {
      return validationError(`semestres[${semesterIndex}].asignaturas`, 'debe ser un array');
    }

    for (const [subjectIndex, subject] of semester.asignaturas.entries()) {
      if (!subject || typeof subject !== 'object') return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}]`, 'debe ser un objeto');
      for (const field of ['id', 'nombre']) {
        if (typeof subject[field] !== 'string' || subject[field].trim() === '') {
          return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}].${field}`, 'debe ser texto no vacío');
        }
      }
      if (!Array.isArray(subject.grupos)) return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}].grupos`, 'debe ser un array');

      for (const [groupIndex, group] of subject.grupos.entries()) {
        if (!group || typeof group !== 'object') return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}].grupos[${groupIndex}]`, 'debe ser un objeto');
        if (group.grupo !== undefined && group.grupo !== null && typeof group.grupo !== 'string' && typeof group.grupo !== 'number') {
          return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}].grupos[${groupIndex}].grupo`, 'debe ser texto o número');
        }
        if (!Array.isArray(group.horarios)) return validationError(`semestres[${semesterIndex}].asignaturas[${subjectIndex}].grupos[${groupIndex}].horarios`, 'debe ser un array');

        for (const [scheduleIndex, schedule] of group.horarios.entries()) {
          if (!schedule || typeof schedule !== 'object') return validationError(`...horarios[${scheduleIndex}]`, 'debe ser un objeto');
          for (const field of ['dia', 'inicio', 'fin']) {
            if (typeof schedule[field] !== 'string' || schedule[field].trim() === '') {
              return validationError(`...horarios[${scheduleIndex}].${field}`, 'debe ser texto no vacío');
            }
          }
          if (schedule.jornada !== undefined && !['diurna', 'nocturna'].includes(schedule.jornada)) {
            return validationError(`...horarios[${scheduleIndex}].jornada`, 'debe ser diurna o nocturna');
          }
        }
      }
    }
  }

  return true;
}