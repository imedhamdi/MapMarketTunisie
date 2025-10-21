export default function validate(schema, property = 'body') {
  return async (req, res, next) => {
    try {
      const value = await schema.validateAsync(req[property], {
        abortEarly: false,
        stripUnknown: true
      });
      req[property] = value;
      next();
    } catch (error) {
      next(error);
    }
  };
}
