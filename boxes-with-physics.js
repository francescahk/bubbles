($ => {

    /**
     * Tracks a box as it is rubberbanded or moved across the drawing area.
     * Note how we can use arrow function notation here because we don't need
     * the `this` variable in this implementation.
     */

     let startDraw = event => {
            $.each(event.changedTouches, function (index, touch) {


             // We only respond to the left mouse button.

                 // Add a new box to the drawing area. Note how we use
                 // the drawing area as a holder of "local" variables
                 // ("this" as bound by jQuery---which is also why we don't
                 // use arrow function notation here).
                 touch.target.anchorX = event.pageX;
                 touch.target.anchorY = event.pageY;
                 let position = { left: touch.target.anchorX, top: touch.target.anchorY };

                 touch.target.drawingBrick = $("<div></div>")
                     .appendTo("div.drawing-area")
                     .addClass("brick")
                     .data({ position }) // This is our model.
                     .offset(position); // This is our view. We keep them separate because the browser might change this.

                 // Take away the highlight behavior while the draw is
                 // happening.



                 });
         };



     let trackDrag = event => {
         $.each(event.changedTouches, function (index, touch) {
             // Don't bother if we aren't tracking anything.
             if (touch.target.movingBrick) {
                 // Reposition the object.
                 let newPosition = {
                     left: touch.pageX - touch.target.deltaX,
                     top: touch.pageY - touch.target.deltaY
                 };

                 // This form of `data` allows us to update values one attribute at a time.
                 $(touch.target).data('position', newPosition);
                 touch.target.movingBrick.offset(newPosition);
             }
             else if (touch.target.drawingBrick){
               let newPosition = {
                   left: (touch.target.anchorX < event.pageX) ? touch.target.anchorX : event.pageX,
                   top: (touch.target.anchorY < event.pageY) ? touch.target.anchorY : event.pageY
               };

               touch.target.drawingBrick
                   .data({ position: newPosition })
                   .offset(newPosition)
                   .width(Math.abs(event.pageX - touch.target.anchorX))
                   .height(Math.abs(event.pageY - touch.target.anchorY));

             }

         });

         // Don't do any touch scrolling.
         event.preventDefault();
     };


    /**
     * Concludes a drawing or moving sequence.
     */
     let endDrag = event => {
         $.each(event.changedTouches, (index, touch) => {

            if (touch.target.movingBrick) {
                 // Change state to "not-moving-anything" by clearing out
                 // touch.target.movingBrick.
                 touch.target.movingBrick = null;
             }
             else if (touch.target.drawingBrick){
               touch.target.drawingBrick
               .bind("touchmove", trackDrag)
               .bind("touchend", unhighlight)
               .bind("touchstart", startMove);

               touch.target.drawingBrick = null;
             }

         });
     };

    /**
     * Indicates that an element is unhighlighted.
     */
    let unhighlight = event => $(event.currentTarget).removeClass("brick-highlight");

    /**
     * Begins a box move sequence.
     */
     let startMove = event => {
         $.each(event.changedTouches, (index, touch) => {
             // Highlight the element.
             $(touch.target).addClass("brick-highlight");

             // Take note of the box's current (global) location. Also, set its velocity and acceleration to
             // nothing because, well, _finger_.
             let targetBrick = $(touch.target);
             let startOffset = targetBrick.offset();
             targetBrick.data({
                 position: startOffset
             });

             // Set the drawing area's state to indicate that it is
             // in the middle of a move.
             touch.target.movingBrick = targetBrick;
             touch.target.deltaX = touch.pageX - startOffset.left;
             touch.target.deltaY = touch.pageY - startOffset.top;
         });

         // Eat up the event so that the drawing area does not
         // deal with it.
         event.stopPropagation();
     };

    /**
     * The motion update routine.
     */
    const FRICTION_FACTOR = 0.99;
    const ACCELERATION_COEFFICIENT = 0.05;
    const FRAME_RATE = 120;
    const FRAME_DURATION = 1000 / FRAME_RATE;

    let lastTimestamp = 0;
    let updateBoxes = timestamp => {
        if (!lastTimestamp) {
            lastTimestamp = timestamp;
        }

        // Keep that frame rate under control.
        if (timestamp - lastTimestamp < FRAME_DURATION) {
            window.requestAnimationFrame(updateBoxes);
            return;
        }

        $("div.box").each((index, element) => {
            let $element = $(element);

            // If it's highlighted, we don't accelerate it because it is under a finger.
            if ($element.hasClass("brick-highlight")) {
                return;
            }

            // Note how we base all of our calculations from the _model_...
            let s = $element.data('position');
            let v = $element.data('velocity');
            let a = $element.data('acceleration');

            // The standard update-bounce sequence.
            s.left += v.x;
            s.top -= v.y;

            v.x += (a.x * ACCELERATION_COEFFICIENT);
            v.y += (a.y * ACCELERATION_COEFFICIENT);
            v.z += (a.z * ACCELERATION_COEFFICIENT);

            v.x *= FRICTION_FACTOR;
            v.y *= FRICTION_FACTOR;
            v.z *= FRICTION_FACTOR;

            let $parent = $element.parent();
            let bounds = {
                left: $parent.offset().left,
                top: $parent.offset().top
            };

            bounds.right = bounds.left + $parent.width();
            bounds.bottom = bounds.top + $parent.height();


            let wid = $element.width();
            let hei = $element.height();


                        if ((s.left <= bounds.left) || (s.left + wid > bounds.right)) {
                            s.left = (s.left <= bounds.left) ? bounds.left : bounds.right - $element.width();
                            v.x = -v.x;
                        }

                        if ((s.top <= bounds.top) || (s.top + hei > bounds.bottom)) {
                            s.top = (s.top <= bounds.top) ? bounds.top : bounds.bottom - $element.height();
                            v.y = -v.y;
                        }


            // ...and the final result is sent on a one-way trip to the _view_.
            $(element).offset(s);
        });



        lastTimestamp = timestamp;
        window.requestAnimationFrame(updateBoxes);
    };

    /**
     * Sets up the given jQuery collection as the drawing area(s).
     */
    let setDrawingArea = jQueryElements => {
        // Set up any pre-existing box elements for touch behavior.
        jQueryElements
            .addClass("drawing-area")
            .each((index, element) => {
              $(element)
                  .bind("touchstart", startDraw)
                  .bind("touchmove", trackDrag)
                  .bind("touchend", endDrag);

            });
            // Event handler setup must be low-level because jQuery
            // doesn't relay touch-specific event properties.



        jQueryElements
            .find("div.box").each((index, element) => {
                $(element)
                    .off()
                    .data({
                        position: $(element).offset(),
                        velocity: { x: 0, y: 0, z: 0 },
                        acceleration: { x: 0, y: 0, z: 0 }
                    });
            });

            jQueryElements
                .find("div.brick").each((index, element) => {
                    $(element)
                      .bind("touchstart", startMove)
                      .bind("touchmove", trackDrag)
                      .bind("touchend", unhighlight)
                        .data({
                            position: $(element).offset()
                        });
                });




        // In this sample, device acceleration is the _sole_ determiner of a box's acceleration.
        window.ondevicemotion = event => {
            let a = event.accelerationIncludingGravity;
            $("div.box").each((index, element) => {
                $(element).data('acceleration', a);
            });
        };

        // Start the animation sequence.
        window.requestAnimationFrame(updateBoxes);
    };

    // No arrow function here because we don't want lexical scoping.
    $.fn.boxesWithPhysics = function () {
        setDrawingArea(this);
        return this;
    };
})(jQuery);
