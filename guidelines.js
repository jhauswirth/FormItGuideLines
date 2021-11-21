JFFGGuideLines = {};

JFFGGuideLines.MakeGuideLinesHistory = function()
{
    console.log("In JFFGGuideLines.GetGuideLineHistory");
    var mainHistID = FormIt.Model.GetHistoryID();
    // Create the guide lines History.
    var groupID = WSM.APICreateGroup(mainHistID, []);
    // Mark the new Group so we can find it later.
    WSM.Utils.SetOrCreateStringAttributeForObject(mainHistID, groupID, "JFFGGuideLinesGroup", "");
    // Mark the new History so we can find it later.
    var nGroupRefHistID = WSM.APIGetGroupReferencedHistoryReadOnly(mainHistID, groupID);
    
    WSM.Utils.SetOrCreateStringAttributeForObject(nGroupRefHistID, WSM.INVALID_ID, "JFFGGuideLinesGroup", "");

    // Put the instance on a Layer.
    var newLayerID = WSM.APICreateLayer(mainHistID, "JFFG Guide Lines", true /*bDisplayed*/);
    //console.log("newLayerID: " + JSON.stringify(newLayerID));
    var instances = WSM.APIGetObjectsByTypeReadOnly(mainHistID, groupID, WSM.nObjectType.nInstanceType);
    //console.log("new instance: " + JSON.stringify(instances));
    var guideLinesInstance = instances[0];
    // Set the Layer for the instance
    WSM.APIAddObjectsLayers(mainHistID, [newLayerID], guideLinesInstance);
    WSM.Utils.SetOrCreateStringAttributeForObject(mainHistID, guideLinesInstance, "JFFGGuideLinesGroup", "");

    // Return the path to the new instance.
    var guidelLinesObjectHistoryID = WSM.ObjectHistoryID(mainHistID, guideLinesInstance);
    //console.log(JSON.stringify(guidelLinesObjectHistoryID));
    var guidelLinesGroupInstancePath =  WSM.GroupInstancePath(guidelLinesObjectHistoryID);
    //console.log("guidelLinesGroupInstancePath: " + JSON.stringify(guidelLinesGroupInstancePath));
    return guidelLinesGroupInstancePath;
}

JFFGGuideLines.GetGuideLinesGroupInstancePath = function()
{
    //console.log("In JFFGGuideLines.GetGuideLineHistory");
    
    // Find the Guide Lines Instance and start editing it
    // Try to find the guide lines instance
    var mainHistID = FormIt.Model.GetHistoryID();
    var instances = WSM.APIGetAllObjectsByTypeReadOnly(mainHistID, WSM.nObjectType.nInstanceType);
    for (var i = 0; i < instances.length; ++i)
    {
        var guideLinesInstance = instances[i];
        //console.log("instance: " + guideLinesInstance);
        var attribute = WSM.Utils.GetStringAttributeForObject(mainHistID, guideLinesInstance, "JFFGGuideLinesGroup");
        //console.log(JSON.stringify("attribute: " + JSON.stringify(attribute)));
        if (attribute.success)
        {
            // Return the path to the new instance.
            var guidelLinesObjectHistoryID = WSM.ObjectHistoryID(mainHistID, guideLinesInstance);
            //console.log(JSON.stringify(guidelLinesObjectHistoryID));
            var guidelLinesGroupInstancePath =  WSM.GroupInstancePath(guidelLinesObjectHistoryID);
            //console.log("guidelLinesGroupInstancePath: " + JSON.stringify(guidelLinesGroupInstancePath));
            return guidelLinesGroupInstancePath;
        }
    }

    // Didn't find the Group, make it...
    return JFFGGuideLines.MakeGuideLinesHistory();
}

JFFGGuideLines.GetGuideLinesHistory = function()
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    //console.log("(JFFGGuideLines.GetGuideLinesHistory) guideLinesInstance: " + JSON.stringify(guideLinesInstance));
    var ids = guideLinesInstance.ids[0];
    //console.log("(JFFGGuideLines.GetGuideLinesHistory) guideLinesInstance.ids: " + JSON.stringify(ids));
    var hisjtoryID = ids.History;
    var instanceID = ids.Object;

    var refHistory = WSM.APIGetGroupReferencedHistoryReadOnly(hisjtoryID, instanceID);
    console.log("(JFFGGuideLines.GetGuideLinesHistory) refHistory: " + JSON.stringify(refHistory));
    return refHistory;
}

// Returns true if editing in the Guide Lines Instance
JFFGGuideLines.InGuideLinesInstance = function()
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    var editContext = FormIt.GroupEdit.GetInContextEditingPath();
    return JSON.stringify(guideLinesInstance) == JSON.stringify(editContext);
}

// Start adding a guide line.
JFFGGuideLines.AddGuideLine = function()
{
    if (JFFGGuideLines.InGuideLinesInstance() && WSM.GroupInstancePath.IsValid(JFFGGuideLines.m_OriginalEditContext))
    {
        FormIt.UI.ShowNotification("Exited Guide Lines Creation.", FormIt.NotificationType.Information);

        FormIt.GroupEdit.SetInContextEditingPath(JFFGGuideLines.m_OriginalEditContext);
        return;
    }

    FormIt.UI.ShowNotification("Start making lines.  When finished click the AG button again.", FormIt.NotificationType.Information);

    // Cache the current context to switch back to.
    JFFGGuideLines.m_OriginalEditContext = FormIt.GroupEdit.GetInContextEditingPath();

    WSM.InferenceEngine.ClearCustomLineInferences();

    // Find the Guide Lines Instance and start editing it
    var guidelLinesGroupInstancePath = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    console.log("guidelLinesGroupInstancePath: " + JSON.stringify(guidelLinesGroupInstancePath));    

    FormIt.GroupEdit.SetInContextEditingPath(guidelLinesGroupInstancePath);
    FormIt.Tools.StartTool(FormIt.ToolType.POLYLINE);
}
FormIt.Commands.RegisterJSCommand("JFFGGuideLines.AddGuideLine");

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.ToolGotFocus = function(payload)
{
    //console.log("(ToolGotFocus) payload: " + JSON.stringify(payload));
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    var editContext = FormIt.GroupEdit.GetInContextEditingPath();
    //console.log("------------- guideLinesInstance: " + JSON.stringify(guideLinesInstance));    
    //console.log("-------------        editContext: " + JSON.stringify(editContext));    
    // Don't apply inferences when editing the guide lines instance.
    // WSM.GroupInstancePath APIs are horked up in v22
    // TODO, use WSM.GroupInstancePath.AreEqual
    if (JSON.stringify(guideLinesInstance) == JSON.stringify(editContext))
    {
        //console.log("In Guide Lines Instance, bailing -------------------------");
        return;
    }

    // Gather all the edges and make custom line inferences.
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    //console.log("------------- guideLinesInstance: " + JSON.stringify(guideLinesInstance));    
    // WSM.GroupInstancePath APIs are horked up in v22
    //var hisjtoryID = WSM.GroupInstancePath.GetFinalObjectHistoryID(guideLinesInstance).History;
    var hisjtoryID = JFFGGuideLines.GetGuideLinesHistory();
    var edges = WSM.APIGetAllObjectsByTypeReadOnly(hisjtoryID, WSM.nObjectType.nEdgeType);
    console.log("-------------        edges: " + JSON.stringify(edges));    
    for (var i = 0; i < edges.length; ++i)
    {
        var edgePath = WSM.GroupInstancePath.AppendObjectHistoryID(guideLinesInstance, WSM.ObjectHistoryID(hisjtoryID, edges[i]));
        WSM.InferenceEngine.AddLineInferencesForObject(edgePath, true /*noLimit*/, true /*alwaysShowInference*/);
        //WSM.InferenceEngine.AddLineInferencesForObject(edgePath);
    }
}

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.ClearGuideLines = function()
{
    //console.log("-------------  (JFFGGuideLines.ClearGuideLines)");
    WSM.InferenceEngine.ClearCustomLineInferences();
}
FormIt.Commands.RegisterJSCommand("JFFGGuideLines.ClearGuideLines");

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.InContextEditing = function(payload)
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath();
    var payloadStr = JSON.stringify(payload);
    var guideLinesInstanceStr = JSON.stringify(guideLinesInstance);

    //console.log("(InContextEditing) payload           : " + payloadStr);
    //console.log("(InContextEditing) guideLinesInstance: " + guideLinesInstanceStr);

    var layerId = FormIt.Layers.GetLayerID("JFFG Guide Lines");
    if (layerId == WSM.INVALID_ID)
    {
        return;
    }

    // If we are editing the guide lines instance, turn on the layer
    var layerData = FormIt.Layers.GetLayerData(layerId);
    layerData.Visible = payloadStr == guideLinesInstanceStr;
    FormIt.Layers.SetLayersVisibility(layerData);
}

// Message handling

 // Create a Message Listener that handles calling the subscribed message handlers.
 if (!(JFFGGuideLines.hasOwnProperty("listener")))
 {
     JFFGGuideLines.listener = FormIt.Messaging.NewMessageListener();
     //console.log("Creating JFFGGuideLines.listener.");
 }
 
 // Assign the msg handlers
 JFFGGuideLines.listener["FormIt.Message.kToolGotFocus"] = function(payload) { JFFGGuideLines.ToolGotFocus(payload); };
 JFFGGuideLines.listener.SubscribeMessage("FormIt.Message.kToolGotFocus");

 JFFGGuideLines.listener["FormIt.Message.kInContextEditing"] = function(payload) { JFFGGuideLines.InContextEditing(payload); };
 JFFGGuideLines.listener.SubscribeMessage("FormIt.Message.kInContextEditing");

