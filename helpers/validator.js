const Joi = require("joi");

const logSchema = Joi.object({
    level: Joi.string().valid('INFO', 'WARNING', 'ERROR', 'DEBUG').required(),
    message: Joi.string().required(),
    user_id: Joi.number().integer().positive().allow(null),
    request_id: Joi.string().max(50),
    ip_address: Joi.string().ip().allow(null),
    user_agent: Joi.string().max(255).allow(null),
    additional_info: Joi.object().allow(null),
  });



module.exports = { logSchema };
