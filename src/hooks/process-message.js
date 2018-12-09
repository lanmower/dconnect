// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

module.exports = function (options = {}) { // eslint-disable-line no-unused-vars
  return async context => {
    const { data } = context;
    // The authenticated user
    const user = context.params.user;
    // The actual message text
    const text = context.data.text?context.data.text.substring(0, 400):null;

    const type = context.data.type?context.data.type
      // Messages can't be longer than 400 characters
      .substring(0, 64):'';

    const metadata = (context.data.metadata&&(context.data.metadata.length<512))?context.data.metadata:'';
     
    const to = context.data.to;    
    // Override the original data (so that people can't submit additional stuff)
    context.data = {
      type,
      userId: user._id,
      createdAt: new Date().getTime()
    };
    if(text) context.data.text = text;
    if(metadata) context.data.metadata = metadata;
    if(to) context.data.to = to;
    // Best practise, hooks should always return the context
    return context;
  };
};
